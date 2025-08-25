#!/bin/bash

# Wizard Backend Restore Script
# Restores data from local or S3 backups

set -e

# Configuration
BACKUP_DIR="/opt/wizard-data/backups"
DATA_DIR="/opt/wizard-data/projects"
RESTORE_DIR="/opt/wizard-data/restore-temp"
S3_BUCKET=${S3_BUCKET:-""}
RESTORE_LOG="/opt/wizard-data/logs/restore.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${RESTORE_LOG}
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a ${RESTORE_LOG}
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a ${RESTORE_LOG}
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a ${RESTORE_LOG}
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a ${RESTORE_LOG}
}

# Function to list available backups
list_backups() {
    echo ""
    echo "===== Available Backups ====="
    echo ""
    
    echo "Local Backups:"
    echo "--------------"
    if [ -d ${BACKUP_DIR} ]; then
        COUNTER=1
        for backup in $(ls -t ${BACKUP_DIR}/wizard-backup-*.tar.gz 2>/dev/null); do
            SIZE=$(ls -lh ${backup} | awk '{print $5}')
            DATE=$(basename ${backup} | sed 's/wizard-backup-\(.*\)\.tar\.gz/\1/')
            echo "  ${COUNTER}. $(basename ${backup}) (${SIZE}) - ${DATE}"
            COUNTER=$((COUNTER + 1))
        done
        
        if [ ${COUNTER} -eq 1 ]; then
            echo "  No local backups found"
        fi
    else
        echo "  Backup directory not found"
    fi
    
    # List S3 backups if configured
    if [ ! -z "${S3_BUCKET}" ] && [ ! -z "${AWS_ACCESS_KEY_ID}" ]; then
        echo ""
        echo "S3 Backups:"
        echo "-----------"
        if command -v aws &> /dev/null; then
            aws s3 ls s3://${S3_BUCKET}/backups/ --human-readable | grep "wizard-backup-" | tail -10
        else
            echo "  AWS CLI not installed"
        fi
    fi
    
    echo ""
}

# Function to restore from local backup
restore_local() {
    local BACKUP_FILE=$1
    
    if [ ! -f "${BACKUP_FILE}" ]; then
        log_error "Backup file not found: ${BACKUP_FILE}"
        return 1
    fi
    
    log_message "Starting restore from: ${BACKUP_FILE}"
    
    # Verify backup integrity
    log_info "Verifying backup integrity..."
    if ! tar -tzf ${BACKUP_FILE} > /dev/null 2>&1; then
        log_error "Backup file is corrupted!"
        return 1
    fi
    log_success "Backup integrity verified"
    
    # Create restore directory
    rm -rf ${RESTORE_DIR}
    mkdir -p ${RESTORE_DIR}
    
    # Extract backup
    log_info "Extracting backup..."
    tar -xzf ${BACKUP_FILE} -C ${RESTORE_DIR}
    
    # Verify extraction
    if [ ! -d "${RESTORE_DIR}/projects" ]; then
        log_error "Invalid backup structure"
        rm -rf ${RESTORE_DIR}
        return 1
    fi
    
    log_success "Backup extracted successfully"
    return 0
}

# Function to restore from S3
restore_s3() {
    local S3_FILE=$1
    local LOCAL_FILE="${BACKUP_DIR}/$(basename ${S3_FILE})"
    
    log_message "Downloading backup from S3: ${S3_FILE}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed"
        return 1
    fi
    
    # Download from S3
    if aws s3 cp s3://${S3_BUCKET}/backups/${S3_FILE} ${LOCAL_FILE}; then
        log_success "Downloaded backup from S3"
        restore_local ${LOCAL_FILE}
        return $?
    else
        log_error "Failed to download backup from S3"
        return 1
    fi
}

# Main restore function
perform_restore() {
    local RESTORE_SOURCE=$1
    
    # Stop services before restore
    log_warning "Stopping Wizard Backend services..."
    if [ -f /opt/wizard-app/stop.sh ]; then
        /opt/wizard-app/stop.sh
    else
        docker-compose -f /opt/wizard-app/docker-compose.production.yml down 2>/dev/null || true
    fi
    
    # Backup current data before restore
    if [ -d ${DATA_DIR} ]; then
        log_info "Creating backup of current data..."
        CURRENT_BACKUP="${BACKUP_DIR}/pre-restore-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf ${CURRENT_BACKUP} -C $(dirname ${DATA_DIR}) $(basename ${DATA_DIR})
        log_success "Current data backed up to: ${CURRENT_BACKUP}"
    fi
    
    # Perform the restore
    if [[ ${RESTORE_SOURCE} == s3://* ]]; then
        restore_s3 $(basename ${RESTORE_SOURCE})
    else
        restore_local ${RESTORE_SOURCE}
    fi
    
    if [ $? -eq 0 ]; then
        # Move restored data to production location
        log_info "Moving restored data to production location..."
        rm -rf ${DATA_DIR}.old
        [ -d ${DATA_DIR} ] && mv ${DATA_DIR} ${DATA_DIR}.old
        mv ${RESTORE_DIR}/projects ${DATA_DIR}
        
        # Fix permissions
        chown -R wizard:wizard ${DATA_DIR}
        chmod -R 755 ${DATA_DIR}
        
        # Clean up
        rm -rf ${RESTORE_DIR}
        
        log_success "Data restored successfully"
        
        # Start services
        log_info "Starting Wizard Backend services..."
        if [ -f /opt/wizard-app/start.sh ]; then
            /opt/wizard-app/start.sh
        else
            docker-compose -f /opt/wizard-app/docker-compose.production.yml up -d
        fi
        
        log_success "Restore completed successfully!"
        
        # Generate restore report
        echo ""
        echo "===== Restore Summary ====="
        echo "Restored from: ${RESTORE_SOURCE}"
        echo "Restore time: $(date)"
        echo "Projects restored: $(find ${DATA_DIR} -maxdepth 2 -type d | wc -l)"
        echo "Total size: $(du -sh ${DATA_DIR} | cut -f1)"
        echo "Previous data backed up to: ${DATA_DIR}.old"
        echo ""
        
        return 0
    else
        log_error "Restore failed!"
        
        # Start services again even if restore failed
        log_info "Starting services..."
        if [ -f /opt/wizard-app/start.sh ]; then
            /opt/wizard-app/start.sh
        fi
        
        return 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p $(dirname ${RESTORE_LOG})

# Main script logic
echo ""
echo "================================================"
echo "   Wizard Backend Restore Utility"
echo "================================================"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    log_error "Please run this script as root (use sudo)"
    exit 1
fi

# Parse command line arguments
case "${1}" in
    list)
        list_backups
        ;;
    
    latest)
        log_message "Restoring from latest backup..."
        LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/wizard-backup-*.tar.gz 2>/dev/null | head -1)
        if [ -z "${LATEST_BACKUP}" ]; then
            log_error "No local backups found"
            exit 1
        fi
        perform_restore ${LATEST_BACKUP}
        ;;
    
    file)
        if [ -z "${2}" ]; then
            log_error "Please specify backup file"
            echo "Usage: $0 file <backup-file-path>"
            exit 1
        fi
        perform_restore ${2}
        ;;
    
    s3)
        if [ -z "${2}" ]; then
            log_error "Please specify S3 backup file"
            echo "Usage: $0 s3 <backup-file-name>"
            exit 1
        fi
        if [ -z "${S3_BUCKET}" ]; then
            log_error "S3_BUCKET environment variable not set"
            exit 1
        fi
        perform_restore "s3://${2}"
        ;;
    
    interactive)
        list_backups
        echo ""
        echo "Enter the full path of the backup to restore"
        echo "(or 's3:filename' for S3 backups):"
        read -r BACKUP_CHOICE
        
        if [ -z "${BACKUP_CHOICE}" ]; then
            log_error "No backup selected"
            exit 1
        fi
        
        echo ""
        log_warning "This will replace all current project data!"
        echo "Are you sure you want to continue? (yes/no)"
        read -r CONFIRMATION
        
        if [ "${CONFIRMATION}" != "yes" ]; then
            log_info "Restore cancelled"
            exit 0
        fi
        
        perform_restore ${BACKUP_CHOICE}
        ;;
    
    *)
        echo "Wizard Backend Restore Utility"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  list        - List available backups"
        echo "  latest      - Restore from latest local backup"
        echo "  file <path> - Restore from specific file"
        echo "  s3 <file>   - Restore from S3 backup"
        echo "  interactive - Interactive restore mode"
        echo ""
        echo "Examples:"
        echo "  $0 list"
        echo "  $0 latest"
        echo "  $0 file /opt/wizard-data/backups/wizard-backup-20240101-120000.tar.gz"
        echo "  $0 s3 wizard-backup-20240101-120000.tar.gz"
        echo "  $0 interactive"
        echo ""
        exit 0
        ;;
esac

exit $?
#!/bin/bash

# Wizard Backend Backup Script
# Handles local and S3 backups with retention policies

set -e

# Configuration
BACKUP_DIR="/opt/wizard-data/backups"
DATA_DIR="/opt/wizard-data/projects"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="wizard-backup-${TIMESTAMP}"
RETENTION_DAYS=${RETENTION_DAYS:-7}
S3_BUCKET=${S3_BUCKET:-""}
BACKUP_LOG="/opt/wizard-data/logs/backup.log"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Logging function
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${BACKUP_LOG}
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a ${BACKUP_LOG}
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a ${BACKUP_LOG}
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a ${BACKUP_LOG}
}

# Create log directory if it doesn't exist
mkdir -p $(dirname ${BACKUP_LOG})

log_message "===== Starting backup process ====="

# Step 1: Check disk space
AVAILABLE_SPACE=$(df ${BACKUP_DIR} | awk 'NR==2 {print $4}')
REQUIRED_SPACE=$(du -s ${DATA_DIR} | awk '{print $1}')

if [ ${AVAILABLE_SPACE} -lt $((REQUIRED_SPACE * 2)) ]; then
    log_warning "Low disk space. Available: ${AVAILABLE_SPACE}KB, Required: $((REQUIRED_SPACE * 2))KB"
    
    # Try to free up space by removing old backups
    log_message "Removing old backups to free up space..."
    find ${BACKUP_DIR} -name "wizard-backup-*.tar.gz" -mtime +$((RETENTION_DAYS / 2)) -delete
fi

# Step 2: Create local backup
log_message "Creating local backup: ${BACKUP_NAME}.tar.gz"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

# Calculate size before backup
SIZE_BEFORE=$(du -sh ${DATA_DIR} | cut -f1)
log_message "Data size: ${SIZE_BEFORE}"

# Create compressed backup with progress
if command -v pv &> /dev/null; then
    # Use pv for progress if available
    tar cf - -C $(dirname ${DATA_DIR}) $(basename ${DATA_DIR}) | \
        pv -s $(du -sb ${DATA_DIR} | awk '{print $1}') | \
        gzip > ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz
else
    # Standard tar without progress
    tar -czf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz -C $(dirname ${DATA_DIR}) $(basename ${DATA_DIR})
fi

# Verify backup
if [ -f ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz ]; then
    BACKUP_SIZE=$(ls -lh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz | awk '{print $5}')
    log_success "Local backup created successfully. Size: ${BACKUP_SIZE}"
    
    # Test backup integrity
    if tar -tzf ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz > /dev/null 2>&1; then
        log_success "Backup integrity verified"
    else
        log_error "Backup integrity check failed!"
        rm -f ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz
        exit 1
    fi
else
    log_error "Failed to create local backup"
    exit 1
fi

# Step 3: Upload to S3 (if configured)
if [ ! -z "${S3_BUCKET}" ] && [ ! -z "${AWS_ACCESS_KEY_ID}" ]; then
    log_message "Uploading backup to S3 bucket: ${S3_BUCKET}"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not installed. Installing..."
        apt-get update && apt-get install -y awscli
    fi
    
    # Upload to S3 with multipart upload for large files
    if aws s3 cp ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz \
        s3://${S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz \
        --storage-class STANDARD_IA \
        --metadata "timestamp=${TIMESTAMP},hostname=$(hostname)" \
        2>&1 | tee -a ${BACKUP_LOG}; then
        
        log_success "Backup uploaded to S3 successfully"
        
        # Verify S3 upload
        if aws s3 ls s3://${S3_BUCKET}/backups/${BACKUP_NAME}.tar.gz > /dev/null 2>&1; then
            log_success "S3 upload verified"
            
            # Remove local backup if S3 upload was successful (keep latest 2 locally)
            LOCAL_BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/wizard-backup-*.tar.gz 2>/dev/null | wc -l)
            if [ ${LOCAL_BACKUP_COUNT} -gt 2 ]; then
                ls -t ${BACKUP_DIR}/wizard-backup-*.tar.gz | tail -n +3 | xargs rm -f
                log_message "Removed old local backups (keeping latest 2)"
            fi
        fi
        
        # Clean up old S3 backups
        log_message "Cleaning up old S3 backups (retention: ${RETENTION_DAYS} days)"
        CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%Y%m%d)
        
        aws s3 ls s3://${S3_BUCKET}/backups/ | \
            grep "wizard-backup-" | \
            while read -r line; do
                FILE_DATE=$(echo $line | awk '{print $4}' | sed 's/wizard-backup-\([0-9]*\)-.*/\1/')
                if [ "${FILE_DATE}" -lt "${CUTOFF_DATE}" ]; then
                    FILE_NAME=$(echo $line | awk '{print $4}')
                    aws s3 rm s3://${S3_BUCKET}/backups/${FILE_NAME}
                    log_message "Removed old S3 backup: ${FILE_NAME}"
                fi
            done
    else
        log_error "Failed to upload backup to S3"
        # Keep local backup if S3 upload failed
    fi
else
    log_warning "S3 not configured. Keeping local backup only."
fi

# Step 4: Clean up old local backups
log_message "Cleaning up old local backups (retention: ${RETENTION_DAYS} days)"
find ${BACKUP_DIR} -name "wizard-backup-*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Step 5: Create backup metadata
cat > ${BACKUP_DIR}/${BACKUP_NAME}.info << EOF
Backup Information
==================
Timestamp: ${TIMESTAMP}
Hostname: $(hostname)
Data Directory: ${DATA_DIR}
Backup File: ${BACKUP_NAME}.tar.gz
Size: ${BACKUP_SIZE}
Files Count: $(find ${DATA_DIR} -type f | wc -l)
Projects Count: $(find ${DATA_DIR} -maxdepth 2 -type d | wc -l)
S3 Bucket: ${S3_BUCKET:-"Not configured"}
Retention Days: ${RETENTION_DAYS}
EOF

# Step 6: Generate backup report
BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/wizard-backup-*.tar.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh ${BACKUP_DIR} | cut -f1)

log_message "===== Backup Summary ====="
log_message "Latest backup: ${BACKUP_NAME}.tar.gz"
log_message "Backup size: ${BACKUP_SIZE}"
log_message "Total backups: ${BACKUP_COUNT}"
log_message "Total backup storage: ${TOTAL_SIZE}"
log_message "===== Backup completed successfully ====="

# Send notification (optional - requires mail setup)
if command -v mail &> /dev/null && [ ! -z "${ADMIN_EMAIL}" ]; then
    echo "Backup completed successfully at $(date). Size: ${BACKUP_SIZE}" | \
        mail -s "Wizard Backup Success - $(hostname)" ${ADMIN_EMAIL}
fi

exit 0
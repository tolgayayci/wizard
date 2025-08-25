#!/bin/bash

# EC2 Storage Setup Script for Wizard Backend
# This script sets up persistent storage directories and EBS volume

set -e

echo "========================================"
echo "   Wizard Backend Storage Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
WIZARD_DATA_DIR="/opt/wizard-data"
WIZARD_APP_DIR="/opt/wizard-app"
WIZARD_USER="wizard"
WIZARD_UID=1000
WIZARD_GID=1000

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Create wizard user if doesn't exist
if ! id -u ${WIZARD_USER} >/dev/null 2>&1; then
    print_info "Creating wizard user..."
    groupadd -g ${WIZARD_GID} ${WIZARD_USER}
    useradd -u ${WIZARD_UID} -g ${WIZARD_GID} -m -s /bin/bash ${WIZARD_USER}
else
    print_info "User ${WIZARD_USER} already exists"
fi

# Create directory structure
print_info "Creating directory structure..."
mkdir -p ${WIZARD_DATA_DIR}/{projects,cargo-registry,build-cache,backups,nginx-cache}
mkdir -p ${WIZARD_APP_DIR}/{nginx,scripts,config}

# Set up EBS volume if available (optional but recommended)
# Check if there's an unmounted EBS volume
DEVICE=$(lsblk -o NAME,FSTYPE,SIZE,TYPE,MOUNTPOINT | grep -E "xvd[fgh].*disk" | grep -v "/" | awk '{print "/dev/"$1}' | head -n1)

if [ ! -z "$DEVICE" ]; then
    print_info "Found unattached EBS volume: $DEVICE"
    
    # Check if device has filesystem
    if ! blkid $DEVICE; then
        print_info "Creating ext4 filesystem on $DEVICE..."
        mkfs.ext4 $DEVICE
    fi
    
    # Mount the EBS volume
    print_info "Mounting EBS volume to ${WIZARD_DATA_DIR}..."
    mount $DEVICE ${WIZARD_DATA_DIR}
    
    # Add to fstab for persistent mounting
    UUID=$(blkid -s UUID -o value $DEVICE)
    if ! grep -q "$UUID" /etc/fstab; then
        echo "UUID=$UUID ${WIZARD_DATA_DIR} ext4 defaults,nofail 0 2" >> /etc/fstab
        print_info "Added EBS volume to /etc/fstab"
    fi
    
    # Re-create subdirectories on mounted volume
    mkdir -p ${WIZARD_DATA_DIR}/{projects,cargo-registry,build-cache,backups,nginx-cache}
else
    print_warning "No unattached EBS volume found. Using local storage."
    print_warning "For production, it's recommended to attach an EBS volume for data persistence."
fi

# Set proper permissions
print_info "Setting permissions..."
chown -R ${WIZARD_USER}:${WIZARD_USER} ${WIZARD_DATA_DIR}
chown -R ${WIZARD_USER}:${WIZARD_USER} ${WIZARD_APP_DIR}
chmod 755 ${WIZARD_DATA_DIR}
chmod 755 ${WIZARD_DATA_DIR}/projects
chmod 755 ${WIZARD_DATA_DIR}/cargo-registry
chmod 755 ${WIZARD_DATA_DIR}/build-cache
chmod 755 ${WIZARD_DATA_DIR}/backups
chmod 755 ${WIZARD_DATA_DIR}/nginx-cache

# Create initial project structure
print_info "Creating initial project structure..."
# Create a test directory to ensure write permissions
sudo -u ${WIZARD_USER} touch ${WIZARD_DATA_DIR}/projects/.write_test && rm ${WIZARD_DATA_DIR}/projects/.write_test

# Set up log rotation
print_info "Configuring log rotation..."
cat > /etc/logrotate.d/wizard << EOF
/opt/wizard-data/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ${WIZARD_USER} ${WIZARD_USER}
}
EOF

# Set up backup cron job
print_info "Setting up automated backups..."
cat > /etc/cron.d/wizard-backup << EOF
# Wizard Backend Automated Backups
# Local backup every 6 hours
0 */6 * * * ${WIZARD_USER} tar -czf ${WIZARD_DATA_DIR}/backups/projects-\$(date +\%Y\%m\%d-\%H\%M\%S).tar.gz -C ${WIZARD_DATA_DIR} projects 2>/dev/null

# Cleanup old backups (keep 7 days)
0 2 * * * ${WIZARD_USER} find ${WIZARD_DATA_DIR}/backups -name "projects-*.tar.gz" -mtime +7 -delete 2>/dev/null

# Disk usage alert (check daily)
0 8 * * * root df -h ${WIZARD_DATA_DIR} | awk '\$5+0 > 80 {print "Warning: Disk usage is " \$5 " on " \$6}' | mail -s "Wizard Disk Usage Alert" root 2>/dev/null || true
EOF

# Install monitoring tools
print_info "Installing monitoring tools..."
apt-get update
apt-get install -y htop iotop ncdu

# Create storage info file
print_info "Creating storage info file..."
cat > ${WIZARD_DATA_DIR}/STORAGE_INFO.txt << EOF
Wizard Backend Storage Information
===================================
Created: $(date)
Data Directory: ${WIZARD_DATA_DIR}
App Directory: ${WIZARD_APP_DIR}

Directory Structure:
- projects/       : User project files (persistent)
- cargo-registry/ : Shared Cargo cache (speeds up builds)
- build-cache/    : Build artifacts cache
- backups/        : Local backup files
- nginx-cache/    : Nginx cache directory

Permissions:
Owner: ${WIZARD_USER} (UID: ${WIZARD_UID}, GID: ${WIZARD_GID})

Backup Schedule:
- Local: Every 6 hours
- Retention: 7 days

Disk Usage:
$(df -h ${WIZARD_DATA_DIR})

To check disk usage: df -h ${WIZARD_DATA_DIR}
To check directory sizes: ncdu ${WIZARD_DATA_DIR}
EOF

# Display summary
echo ""
echo "========================================"
echo "   Storage Setup Complete!"
echo "========================================"
echo ""
print_info "Data directory: ${WIZARD_DATA_DIR}"
print_info "App directory: ${WIZARD_APP_DIR}"
print_info "Owner: ${WIZARD_USER}"
echo ""

# Check disk space
DISK_USAGE=$(df -h ${WIZARD_DATA_DIR} | awk 'NR==2 {print $5}' | sed 's/%//')
DISK_AVAIL=$(df -h ${WIZARD_DATA_DIR} | awk 'NR==2 {print $4}')

if [ $DISK_USAGE -gt 80 ]; then
    print_warning "Disk usage is high: ${DISK_USAGE}%"
else
    print_info "Available disk space: ${DISK_AVAIL}"
fi

echo ""
print_info "Next steps:"
echo "  1. Copy your .env.production file to ${WIZARD_APP_DIR}/config/"
echo "  2. Run the main deployment script: ./deploy-ec2.sh"
echo ""
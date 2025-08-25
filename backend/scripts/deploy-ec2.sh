#!/bin/bash

# Main EC2 Deployment Script for Wizard Backend
# Recommended instance: t3.xlarge (4 vCPU, 16GB RAM)

set -e

echo "================================================"
echo "   Wizard Backend EC2 Deployment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
INSTANCE_TYPE="t3.xlarge"
REGION="us-east-1"
DOMAIN=${DOMAIN:-"wizard.example.com"}
EMAIL=${EMAIL:-"admin@example.com"}

# Functions
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Step 1: System Update
print_step "Updating system packages..."
apt-get update
apt-get upgrade -y

# Step 2: Install required packages
print_step "Installing required packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    iotop \
    ncdu \
    net-tools \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    ufw \
    fail2ban \
    unattended-upgrades

# Step 3: Configure Swap (4GB for safety)
print_step "Configuring swap space..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    
    # Configure swappiness for better performance
    echo "vm.swappiness=10" >> /etc/sysctl.conf
    echo "vm.vfs_cache_pressure=50" >> /etc/sysctl.conf
    sysctl -p
    
    print_info "4GB swap configured"
else
    print_info "Swap already configured"
fi

# Step 4: Install Docker
print_step "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Configure Docker daemon for production
    cat > /etc/docker/daemon.json << EOF
{
    "log-driver": "json-file",
    "log-opts": {
        "max-size": "10m",
        "max-file": "3"
    },
    "storage-driver": "overlay2",
    "live-restore": true,
    "userland-proxy": false
}
EOF
    
    systemctl restart docker
    systemctl enable docker
    print_info "Docker installed and configured"
else
    print_info "Docker already installed"
fi

# Step 5: Install Docker Compose
print_step "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_info "Docker Compose installed"
else
    print_info "Docker Compose already installed"
fi

# Step 6: Set up storage
print_step "Setting up storage..."
./setup-ec2-storage.sh

# Step 7: Configure firewall
print_step "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8080/tcp  # Backend API (will be proxied through nginx)
print_info "Firewall configured"

# Step 8: Set up fail2ban for security
print_step "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[docker-nginx]
enabled = true
port = http,https
logpath = /opt/wizard-data/logs/nginx-access.log
maxretry = 10
findtime = 10m
bantime = 30m
EOF

systemctl restart fail2ban
systemctl enable fail2ban
print_info "Fail2ban configured"

# Step 9: Configure system limits
print_step "Configuring system limits..."
cat >> /etc/security/limits.conf << EOF
# Wizard Backend Limits
wizard soft nofile 65536
wizard hard nofile 65536
wizard soft nproc 32768
wizard hard nproc 32768
EOF

cat >> /etc/sysctl.conf << EOF
# Wizard Backend Optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
EOF

sysctl -p
print_info "System limits configured"

# Step 10: Install monitoring tools
print_step "Installing monitoring tools..."
# Install Node Exporter for Prometheus
NODE_EXPORTER_VERSION="1.7.0"
wget https://github.com/prometheus/node_exporter/releases/download/v${NODE_EXPORTER_VERSION}/node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
tar xvf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64.tar.gz
cp node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64/node_exporter /usr/local/bin/
rm -rf node_exporter-${NODE_EXPORTER_VERSION}.linux-amd64*

# Create systemd service for node_exporter
cat > /etc/systemd/system/node_exporter.service << EOF
[Unit]
Description=Node Exporter
After=network.target

[Service]
User=nobody
Group=nogroup
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl start node_exporter
systemctl enable node_exporter
print_info "Monitoring tools installed"

# Step 11: Set up SSL with Let's Encrypt (optional, requires domain)
print_step "Setting up SSL certificates..."
if [ "$DOMAIN" != "wizard.example.com" ]; then
    apt-get install -y certbot
    certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive
    
    # Set up auto-renewal
    cat > /etc/cron.d/certbot-renewal << EOF
0 0,12 * * * root certbot renew --quiet --no-self-upgrade --post-hook "docker-compose -f /opt/wizard-app/docker-compose.production.yml restart nginx"
EOF
    print_info "SSL certificates configured for $DOMAIN"
else
    print_warning "Skipping SSL setup. Set DOMAIN and EMAIL environment variables for SSL."
fi

# Step 12: Clone repository and build
print_step "Setting up application..."
cd /opt/wizard-app

# Copy docker-compose and other files
# Note: In production, you would clone from your repository
print_info "Copy your docker-compose.production.yml and .env.production to /opt/wizard-app/"

# Step 13: Create helper scripts
print_step "Creating helper scripts..."

# Create start script
cat > /opt/wizard-app/start.sh << 'EOF'
#!/bin/bash
cd /opt/wizard-app
docker-compose -f docker-compose.production.yml up -d
echo "Wizard Backend started. Check status with: docker-compose -f docker-compose.production.yml ps"
EOF
chmod +x /opt/wizard-app/start.sh

# Create stop script
cat > /opt/wizard-app/stop.sh << 'EOF'
#!/bin/bash
cd /opt/wizard-app
docker-compose -f docker-compose.production.yml down
echo "Wizard Backend stopped."
EOF
chmod +x /opt/wizard-app/stop.sh

# Create restart script
cat > /opt/wizard-app/restart.sh << 'EOF'
#!/bin/bash
cd /opt/wizard-app
docker-compose -f docker-compose.production.yml restart
echo "Wizard Backend restarted."
EOF
chmod +x /opt/wizard-app/restart.sh

# Create logs script
cat > /opt/wizard-app/logs.sh << 'EOF'
#!/bin/bash
cd /opt/wizard-app
docker-compose -f docker-compose.production.yml logs -f
EOF
chmod +x /opt/wizard-app/logs.sh

# Create status script
cat > /opt/wizard-app/status.sh << 'EOF'
#!/bin/bash
echo "=== Docker Containers ==="
docker ps
echo ""
echo "=== Disk Usage ==="
df -h /opt/wizard-data
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== System Load ==="
uptime
EOF
chmod +x /opt/wizard-app/status.sh

# Step 14: Create systemd service
print_step "Creating systemd service..."
cat > /etc/systemd/system/wizard-backend.service << EOF
[Unit]
Description=Wizard Backend
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/wizard-app
ExecStart=/usr/local/bin/docker-compose -f docker-compose.production.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wizard-backend

# Step 15: Display summary
echo ""
echo "================================================"
echo "   Deployment Setup Complete!"
echo "================================================"
echo ""
print_info "Instance type recommendation: ${INSTANCE_TYPE}"
print_info "Storage location: /opt/wizard-data"
print_info "Application location: /opt/wizard-app"
echo ""
print_info "Next steps:"
echo "  1. Copy your .env.production file to /opt/wizard-app/"
echo "  2. Copy docker-compose.production.yml to /opt/wizard-app/"
echo "  3. Copy nginx configuration to /opt/wizard-app/nginx/"
echo "  4. Build and start services: cd /opt/wizard-app && ./start.sh"
echo ""
print_info "Useful commands:"
echo "  Start:   /opt/wizard-app/start.sh"
echo "  Stop:    /opt/wizard-app/stop.sh"
echo "  Restart: /opt/wizard-app/restart.sh"
echo "  Logs:    /opt/wizard-app/logs.sh"
echo "  Status:  /opt/wizard-app/status.sh"
echo ""
print_warning "Remember to:"
echo "  - Configure your domain DNS to point to this server"
echo "  - Update security groups to allow ports 80, 443"
echo "  - Set up monitoring and alerting"
echo "  - Configure backups to S3"
echo ""
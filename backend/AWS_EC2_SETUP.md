# AWS EC2 Setup Guide for Wizard Backend

This guide walks you through deploying the Wizard Backend on AWS EC2 with full security, authentication, and SSL.

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Step 1: Launch EC2 Instance](#step-1-launch-ec2-instance)
- [Step 2: Configure Security Groups](#step-2-configure-security-groups)
- [Step 3: Connect to Instance](#step-3-connect-to-instance)
- [Step 4: Clone and Setup Project](#step-4-clone-and-setup-project)
- [Step 5: Configure Environment](#step-5-configure-environment)
- [Step 6: Deploy Application](#step-6-deploy-application)
- [Step 7: Setup SSL Certificate](#step-7-setup-ssl-certificate)
- [Step 8: Configure Authentication](#step-8-configure-authentication)
- [Step 9: Setup Monitoring](#step-9-setup-monitoring)
- [Step 10: Verify Deployment](#step-10-verify-deployment)
- [Maintenance](#maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account with EC2 access
- Domain name (for SSL)
- AWS CLI configured (optional)
- Git repository with your code

## Step 1: Launch EC2 Instance

### Option A: Using AWS Console

1. **Login to AWS Console** → EC2 → Launch Instance

2. **Configure Instance**:
   - **Name**: `wizard-backend-prod`
   - **AMI**: Ubuntu Server 22.04 LTS (64-bit x86)
   - **Instance Type**: `t3.xlarge` (4 vCPU, 16GB RAM)
   - **Key Pair**: Create new or use existing

3. **Configure Storage**:
   - Root volume: 30GB GP3
   - Add EBS Volume: 100GB GP3 (for data persistence)

4. **Network Settings**:
   - VPC: Default or your custom VPC
   - Subnet: Public subnet
   - Auto-assign public IP: Enable

### Option B: Using AWS CLI

```bash
# Create key pair
aws ec2 create-key-pair \
    --key-name wizard-backend-key \
    --query 'KeyMaterial' \
    --output text > wizard-backend-key.pem

chmod 400 wizard-backend-key.pem

# Launch instance
aws ec2 run-instances \
    --image-id ami-0c55b159cbfafe1f0 \
    --instance-type t3.xlarge \
    --key-name wizard-backend-key \
    --security-group-ids sg-xxxxxxxxx \
    --subnet-id subnet-xxxxxxxxx \
    --block-device-mappings '[
        {
            "DeviceName": "/dev/sda1",
            "Ebs": {
                "VolumeSize": 30,
                "VolumeType": "gp3",
                "DeleteOnTermination": true
            }
        },
        {
            "DeviceName": "/dev/sdf",
            "Ebs": {
                "VolumeSize": 100,
                "VolumeType": "gp3",
                "DeleteOnTermination": false
            }
        }
    ]' \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wizard-backend-prod}]' \
    --user-data file://user-data.sh
```

## Step 2: Configure Security Groups

### Create Security Group

```bash
# Create security group
aws ec2 create-security-group \
    --group-name wizard-backend-sg \
    --description "Security group for Wizard Backend"

# Add rules
aws ec2 authorize-security-group-ingress \
    --group-name wizard-backend-sg \
    --protocol tcp --port 22 --cidr 0.0.0.0/0  # SSH (restrict to your IP in production)

aws ec2 authorize-security-group-ingress \
    --group-name wizard-backend-sg \
    --protocol tcp --port 80 --cidr 0.0.0.0/0  # HTTP

aws ec2 authorize-security-group-ingress \
    --group-name wizard-backend-sg \
    --protocol tcp --port 443 --cidr 0.0.0.0/0  # HTTPS
```

### Security Group Rules

| Type | Protocol | Port | Source | Description |
|------|----------|------|--------|-------------|
| SSH | TCP | 22 | Your IP | Admin access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |

## Step 3: Connect to Instance

### Get Instance IP

```bash
# Get public IP
aws ec2 describe-instances \
    --filters "Name=tag:Name,Values=wizard-backend-prod" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text
```

### SSH into Instance

```bash
ssh -i wizard-backend-key.pem ubuntu@<INSTANCE_IP>
```

## Step 4: Clone and Setup Project

### On the EC2 Instance:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install git
sudo apt install -y git

# Clone your repository
git clone https://github.com/YOUR_USERNAME/wizard-backend.git
cd wizard-backend/backend

# Make scripts executable
chmod +x scripts/*.sh
```

## Step 5: Configure Environment

### Create Production Environment File

```bash
# Copy environment template
sudo cp .env.production /opt/wizard-app/.env.production

# Edit with your values
sudo nano /opt/wizard-app/.env.production
```

### Required Environment Variables

```env
# CHANGE ALL THESE VALUES!

# JWT Secret (generate with: openssl rand -hex 32)
JWT_SECRET=your-generated-secret-key-here

# Blockchain Configuration
CONTRACT_PRIVATE_KEY=your-wallet-private-key
WIZARD_WALLET_ADDRESS=your-wallet-address

# AWS Configuration (for backups)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BACKUP_BUCKET=wizard-backups-YOUR-UNIQUE-NAME

# Domain Configuration
DOMAIN=wizard.yourdomain.com
EMAIL=admin@yourdomain.com

# Database (if using external)
DATABASE_URL=postgresql://user:password@localhost/wizard
```

## Step 6: Deploy Application

### Run Deployment Script

```bash
# Run the main deployment script
sudo ./scripts/deploy-ec2.sh

# This script will:
# - Install Docker and Docker Compose
# - Set up storage directories
# - Configure firewall
# - Install monitoring tools
# - Create systemd service
```

### Setup Storage

```bash
# Run storage setup
sudo ./scripts/setup-ec2-storage.sh

# Verify storage
df -h /opt/wizard-data
```

### Build and Start Services

```bash
cd /opt/wizard-app

# Copy files
sudo cp ~/wizard-backend/backend/docker-compose.production.yml .
sudo cp ~/wizard-backend/backend/Dockerfile.production .
sudo cp ~/wizard-backend/backend/Dockerfile.compiler .
sudo cp -r ~/wizard-backend/backend/nginx .
sudo cp -r ~/wizard-backend/backend/src .
sudo cp ~/wizard-backend/backend/Cargo.* .

# Build Docker images
sudo docker-compose -f docker-compose.production.yml build

# Start services
sudo docker-compose -f docker-compose.production.yml up -d

# Check status
sudo docker-compose -f docker-compose.production.yml ps
```

## Step 7: Setup SSL Certificate

### Point Domain to EC2

1. **Get Elastic IP**:
```bash
# Allocate Elastic IP
aws ec2 allocate-address --domain vpc

# Associate with instance
aws ec2 associate-address \
    --instance-id <INSTANCE_ID> \
    --allocation-id <ALLOCATION_ID>
```

2. **Update DNS Records**:
   - Add A record: `wizard.yourdomain.com` → `<ELASTIC_IP>`
   - Wait for DNS propagation (5-30 minutes)

### Generate SSL Certificate

```bash
# Run SSL setup script
sudo ./scripts/setup-ssl.sh wizard.yourdomain.com admin@yourdomain.com

# For testing (staging certificate)
sudo ./scripts/setup-ssl.sh wizard.yourdomain.com admin@yourdomain.com true
```

## Step 8: Configure Authentication

### Initialize Admin User

```bash
# Create admin user
./scripts/init-admin.sh \
    --email admin@yourdomain.com \
    --password YourSecurePassword123!

# Save the token that's returned
```

### Test Authentication

```bash
# Test registration
curl -X POST https://wizard.yourdomain.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123!"}'

# Test login
curl -X POST https://wizard.yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## Step 9: Setup Monitoring

### CloudWatch Agent

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Start agent
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

### Set Up Alarms

```bash
# CPU alarm
aws cloudwatch put-metric-alarm \
    --alarm-name wizard-backend-cpu \
    --alarm-description "Alert when CPU exceeds 80%" \
    --metric-name CPUUtilization \
    --namespace AWS/EC2 \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2

# Disk space alarm
aws cloudwatch put-metric-alarm \
    --alarm-name wizard-backend-disk \
    --alarm-description "Alert when disk usage exceeds 80%" \
    --metric-name DiskSpaceUtilization \
    --namespace System/Linux \
    --statistic Average \
    --period 300 \
    --threshold 80 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 1
```

## Step 10: Verify Deployment

### Health Checks

```bash
# Check health endpoint
curl https://wizard.yourdomain.com/health

# Check SSL certificate
curl -vI https://wizard.yourdomain.com

# Check services
sudo docker-compose -f /opt/wizard-app/docker-compose.production.yml ps

# Check logs
sudo docker-compose -f /opt/wizard-app/docker-compose.production.yml logs -f

# Check resource usage
docker stats
htop
```

### Test Core Features

```bash
# 1. Test compilation (with auth token)
TOKEN="your-auth-token"

curl -X POST https://wizard.yourdomain.com/api/compile \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "user_id": "test-user",
        "project_id": "test-project",
        "code": "// Rust code here"
    }'

# 2. Test WebSocket terminal
wscat -c wss://wizard.yourdomain.com/ws/terminal \
    -H "Authorization: Bearer $TOKEN"
```

## Maintenance

### Daily Tasks

```bash
# Check disk usage
df -h /opt/wizard-data

# Check logs for errors
grep ERROR /opt/wizard-data/logs/*.log

# Monitor memory
free -h

# Check backup status
ls -la /opt/wizard-data/backups/
```

### Weekly Tasks

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Clean Docker resources
docker system prune -af

# Check SSL certificate
sudo certbot certificates
```

### Backup Management

```bash
# Manual backup
sudo /opt/wizard-app/scripts/backup.sh

# Restore from backup
sudo /opt/wizard-app/scripts/restore.sh list
sudo /opt/wizard-app/scripts/restore.sh latest

# Setup S3 sync
aws s3 sync /opt/wizard-data/projects s3://wizard-backups/projects/
```

## Troubleshooting

### Common Issues

#### 1. Services Won't Start
```bash
# Check Docker
sudo systemctl status docker
sudo journalctl -u docker

# Check compose logs
cd /opt/wizard-app
sudo docker-compose -f docker-compose.production.yml logs

# Restart services
sudo docker-compose -f docker-compose.production.yml restart
```

#### 2. SSL Certificate Issues
```bash
# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal

# Check nginx config
sudo docker exec wizard-nginx nginx -t
```

#### 3. Out of Memory
```bash
# Check memory usage
free -h
docker stats

# Restart services
cd /opt/wizard-app
sudo ./restart.sh

# Clear caches
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

#### 4. Authentication Issues
```bash
# Check JWT secret
grep JWT_SECRET /opt/wizard-app/.env.production

# Test token validation
curl https://wizard.yourdomain.com/api/auth/verify \
    -H "Authorization: Bearer YOUR_TOKEN"

# Check middleware logs
sudo docker logs wizard-backend | grep AUTH
```

### Emergency Commands

```bash
# Stop all services
cd /opt/wizard-app && sudo ./stop.sh

# Start all services
cd /opt/wizard-app && sudo ./start.sh

# Full reset
sudo docker stop $(sudo docker ps -aq)
sudo docker system prune -af --volumes
cd /opt/wizard-app && sudo ./start.sh
```

## Security Checklist

- [ ] Changed all default passwords in `.env.production`
- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (only ports 22, 80, 443 open)
- [ ] Security groups properly configured
- [ ] Admin user created with strong password
- [ ] Backup to S3 configured
- [ ] CloudWatch monitoring enabled
- [ ] Rate limiting configured in nginx
- [ ] JWT secret is unique and secure
- [ ] Database credentials are secure
- [ ] Docker socket permissions restricted
- [ ] Automatic security updates enabled

## Cost Optimization

### Instance Sizing
- **Development**: t3.large (2 vCPU, 8GB RAM) - ~$60/month
- **Production**: t3.xlarge (4 vCPU, 16GB RAM) - ~$120/month
- **High Load**: t3.2xlarge (8 vCPU, 32GB RAM) - ~$240/month

### Storage
- **EBS GP3**: 100GB - ~$8/month
- **S3 Backups**: ~$2-5/month

### Data Transfer
- **Incoming**: Free
- **Outgoing**: First 1GB free, then $0.09/GB

### Total Estimated Cost
- **Basic Setup**: ~$130-150/month
- **With Backups & Monitoring**: ~$140-160/month

## Support

### Logs Location
- Backend: `/opt/wizard-data/logs/backend.log`
- Nginx: `/var/log/nginx/`
- Docker: `docker-compose logs`

### Configuration Files
- Environment: `/opt/wizard-app/.env.production`
- Docker Compose: `/opt/wizard-app/docker-compose.production.yml`
- Nginx: `/opt/wizard-app/nginx/nginx.conf`

### Useful Commands
```bash
# Service management
/opt/wizard-app/start.sh    # Start services
/opt/wizard-app/stop.sh     # Stop services
/opt/wizard-app/restart.sh  # Restart services
/opt/wizard-app/logs.sh     # View logs
/opt/wizard-app/status.sh   # Check status

# Backup management
/opt/wizard-app/scripts/backup.sh         # Create backup
/opt/wizard-app/scripts/restore.sh list   # List backups
/opt/wizard-app/scripts/restore.sh latest # Restore latest

# SSL management
/opt/wizard-app/renew-ssl.sh  # Manual SSL renewal
certbot certificates           # Check certificate status
```

## Next Steps

After successful deployment:

1. **Configure DNS**: Point your domain to the Elastic IP
2. **Set up CDN**: Use CloudFront for better performance
3. **Enable WAF**: Add AWS WAF for additional security
4. **Configure Alerts**: Set up SNS notifications
5. **Load Testing**: Test with expected traffic
6. **Documentation**: Document your specific configuration
7. **Backup Testing**: Test backup and restore procedures

---

**Need Help?** Check the logs first, then refer to the [troubleshooting section](#troubleshooting) or [DEPLOYMENT.md](./DEPLOYMENT.md) for more details.
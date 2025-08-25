# Wizard Backend Production Deployment Guide

## 📋 Table of Contents
- [Requirements](#requirements)
- [Security Review](#security-review)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Testing](#testing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)

## 🔒 Security Review

### Critical Security Issues Identified and Mitigated:

1. **Authentication**: Currently NO authentication middleware - YOU MUST add JWT validation
2. **Secrets Management**: Use AWS Secrets Manager for production keys
3. **Network Isolation**: Docker containers isolated with custom network
4. **Resource Limits**: Memory and CPU limits enforced
5. **Input Validation**: Add validation middleware before production
6. **Terminal Service**: Sandboxed with command whitelist

### Security Recommendations:
- [ ] Implement JWT authentication middleware
- [ ] Use AWS Secrets Manager for all secrets
- [ ] Enable WAF on CloudFront/ALB
- [ ] Set up VPC with private subnets
- [ ] Enable AWS GuardDuty
- [ ] Configure CloudWatch alarms
- [ ] Use AWS KMS for encryption

## 📦 Requirements

### AWS EC2 Instance
- **Recommended**: t3.xlarge (4 vCPU, 16GB RAM)
- **Minimum**: t3.large (2 vCPU, 8GB RAM)
- **Storage**: 100GB GP3 EBS volume
- **OS**: Ubuntu 22.04 LTS

### Required Ports
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 8080 (Backend API - internal only)

## 🚀 Quick Start

```bash
# 1. Launch EC2 instance (t3.xlarge)
# 2. SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Clone repository
git clone https://github.com/your-org/wizard-backend.git
cd wizard-backend/backend

# 4. Run deployment script
sudo ./scripts/deploy-ec2.sh

# 5. Configure environment
sudo cp .env.production /opt/wizard-app/.env.production
sudo nano /opt/wizard-app/.env.production  # Edit with your values

# 6. Copy files to EC2
sudo cp docker-compose.production.yml /opt/wizard-app/
sudo cp -r nginx /opt/wizard-app/
sudo cp Dockerfile.production /opt/wizard-app/

# 7. Build and start
cd /opt/wizard-app
sudo docker-compose -f docker-compose.production.yml build
sudo ./start.sh
```

## 📖 Detailed Setup

### Step 1: AWS EC2 Setup

1. **Launch Instance**:
   ```bash
   aws ec2 run-instances \
     --image-id ami-0c94855ba2b6b3d2f \
     --instance-type t3.xlarge \
     --key-name your-key \
     --security-group-ids sg-xxx \
     --subnet-id subnet-xxx \
     --block-device-mappings DeviceName=/dev/sda1,Ebs={VolumeSize=100,VolumeType=gp3} \
     --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=wizard-backend}]'
   ```

2. **Security Group Rules**:
   ```bash
   # Allow SSH
   aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 22 --cidr 0.0.0.0/0
   
   # Allow HTTP
   aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 80 --cidr 0.0.0.0/0
   
   # Allow HTTPS
   aws ec2 authorize-security-group-ingress --group-id sg-xxx --protocol tcp --port 443 --cidr 0.0.0.0/0
   ```

3. **Attach Elastic IP**:
   ```bash
   aws ec2 allocate-address --domain vpc
   aws ec2 associate-address --instance-id i-xxx --allocation-id eipalloc-xxx
   ```

### Step 2: Storage Setup

```bash
# Run storage setup script
sudo ./scripts/setup-ec2-storage.sh

# Verify storage
df -h /opt/wizard-data
ls -la /opt/wizard-data/
```

### Step 3: SSL Configuration

```bash
# Set domain and email
export DOMAIN=wizard.yourdomain.com
export EMAIL=admin@yourdomain.com

# Install certbot
sudo apt-get install -y certbot

# Get SSL certificate
sudo certbot certonly --standalone -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

# Copy certificates
sudo mkdir -p /opt/wizard-app/nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /opt/wizard-app/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /opt/wizard-app/nginx/ssl/
```

### Step 4: Environment Configuration

Edit `/opt/wizard-app/.env.production`:

```bash
# Critical configurations to change:
JWT_SECRET=<generate-with: openssl rand -hex 32>
CONTRACT_PRIVATE_KEY=<your-wallet-private-key>
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>
S3_BACKUP_BUCKET=<your-s3-bucket>
DOMAIN=<your-domain>
```

### Step 5: Build and Deploy

```bash
cd /opt/wizard-app

# Build images
sudo docker-compose -f docker-compose.production.yml build

# Start services
sudo docker-compose -f docker-compose.production.yml up -d

# Check status
sudo docker-compose -f docker-compose.production.yml ps

# View logs
sudo docker-compose -f docker-compose.production.yml logs -f
```

## 🧪 Testing

### 1. Health Check
```bash
curl http://localhost:8080/health
# Expected: {"status":"healthy"}
```

### 2. Compilation Test
```bash
# Create test project
curl -X POST http://localhost:8080/api/projects \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","project_id":"test-project","code":"// Test"}'

# Compile
curl -X POST http://localhost:8080/api/compile \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","project_id":"test-project"}'
```

### 3. Load Testing
```bash
# Install Apache Bench
sudo apt-get install -y apache2-utils

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:8080/health

# Monitor during test
docker stats
htop
```

### 4. Security Testing
```bash
# Check for open ports
sudo netstat -tlnp

# Test rate limiting
for i in {1..100}; do curl http://localhost:8080/api/compile; done

# Check Docker isolation
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Verify file permissions
ls -la /opt/wizard-data/
```

## 📊 Monitoring

### CloudWatch Setup
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure and start
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
sudo systemctl start amazon-cloudwatch-agent
```

### Prometheus Metrics
```bash
# Access metrics
curl http://localhost:9090/metrics

# Key metrics to monitor:
# - Memory usage per container
# - Compilation queue length
# - Request latency
# - Error rates
```

### Logging
```bash
# View all logs
cd /opt/wizard-app
./logs.sh

# View specific service
docker-compose -f docker-compose.production.yml logs -f backend

# Check log files
tail -f /opt/wizard-data/logs/backend.log
tail -f /opt/wizard-data/logs/backup.log
```

## 🔧 Troubleshooting

### Common Issues

1. **Out of Memory**:
   ```bash
   # Check memory usage
   free -h
   docker stats
   
   # Restart services
   cd /opt/wizard-app
   ./restart.sh
   
   # Clear cache
   docker system prune -af
   ```

2. **Compilation Timeout**:
   ```bash
   # Check compilation workers
   docker-compose -f docker-compose.production.yml ps compiler-worker
   
   # Restart workers
   docker-compose -f docker-compose.production.yml restart compiler-worker
   ```

3. **Disk Space**:
   ```bash
   # Check disk usage
   df -h
   ncdu /opt/wizard-data
   
   # Clean up old projects
   find /opt/wizard-data/projects -type d -mtime +30 -exec rm -rf {} \;
   ```

4. **Connection Issues**:
   ```bash
   # Check nginx
   docker-compose -f docker-compose.production.yml logs nginx
   
   # Test backend directly
   curl http://backend:8080/health
   ```

## 🛠 Maintenance

### Daily Tasks
- Check disk usage: `df -h /opt/wizard-data`
- Review error logs: `grep ERROR /opt/wizard-data/logs/*.log`
- Monitor memory: `free -h`

### Weekly Tasks
- Review backup status: `ls -la /opt/wizard-data/backups/`
- Check for updates: `docker-compose pull`
- Clean old data: `docker system prune -af`

### Monthly Tasks
- Security updates: `sudo apt-get update && sudo apt-get upgrade`
- SSL renewal: `sudo certbot renew`
- Performance review: Check CloudWatch metrics

### Backup Procedures

**Manual Backup**:
```bash
sudo /opt/wizard-app/scripts/backup.sh
```

**Restore from Backup**:
```bash
# List backups
sudo /opt/wizard-app/scripts/restore.sh list

# Restore latest
sudo /opt/wizard-app/scripts/restore.sh latest

# Restore from S3
sudo /opt/wizard-app/scripts/restore.sh s3 wizard-backup-20240101-120000.tar.gz
```

### Scaling

**Vertical Scaling**:
1. Stop instance
2. Change instance type
3. Start instance

**Horizontal Scaling**:
1. Set up Application Load Balancer
2. Launch additional EC2 instances
3. Share storage via EFS
4. Use RDS for shared state

## 📞 Support

### Logs Location
- Backend: `/opt/wizard-data/logs/backend.log`
- Nginx: `/var/log/nginx/`
- Docker: `docker-compose logs`

### Health Endpoints
- Backend: `http://localhost:8080/health`
- Nginx: `http://localhost/health`
- Metrics: `http://localhost:9090/metrics`

### Emergency Commands
```bash
# Stop all services
cd /opt/wizard-app && ./stop.sh

# Start all services
cd /opt/wizard-app && ./start.sh

# Emergency cleanup
docker stop $(docker ps -aq)
docker system prune -af --volumes

# Reset everything
sudo rm -rf /opt/wizard-data/projects/*
cd /opt/wizard-app && ./restart.sh
```

## 🎯 Performance Tuning

### Optimizations Applied
- Shared cargo cache (saves 2GB RAM)
- Container pooling (4 reusable containers)
- Compilation queue (max 4 concurrent)
- Response caching in Nginx
- Memory limits per service

### Resource Allocation
```
Total: 10GB RAM
├── Nginx: 256MB
├── Backend: 1GB
├── Compilation: 4GB (4×1GB)
├── Terminal Sessions: 4GB
└── Buffer: ~750MB
```

### Monitoring Commands
```bash
# Real-time stats
docker stats

# System resources
htop

# Network connections
netstat -an | grep ESTABLISHED | wc -l

# Disk I/O
iotop
```

## ✅ Production Checklist

Before going live:
- [ ] Change all default passwords in .env.production
- [ ] Configure SSL certificates
- [ ] Set up S3 backups
- [ ] Configure CloudWatch monitoring
- [ ] Test rate limiting
- [ ] Verify Docker resource limits
- [ ] Set up alerting
- [ ] Document emergency contacts
- [ ] Test backup/restore procedures
- [ ] Load test with expected traffic

## 📝 Notes

- The system is designed for up to 20 concurrent users
- Compilation timeout is set to 30 seconds
- Projects are auto-cleaned after 30 days of inactivity
- Backups run every 6 hours
- SSL certificates auto-renew via cron
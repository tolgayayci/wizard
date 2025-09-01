# EC2 Deployment Quick Start

## 1. Configure EC2 Security Group

### In AWS Console:
1. Go to **EC2 Dashboard** → **Security Groups**
2. Select your instance's security group
3. Click **Edit inbound rules**
4. Add these rules:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| Custom TCP | TCP | 8080 | 0.0.0.0/0 | Wizard Backend API |
| SSH | TCP | 22 | Your IP | SSH Access |
| HTTP | TCP | 80 | 0.0.0.0/0 | HTTP (if using nginx) |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS (if using nginx) |

### Using AWS CLI:
```bash
# Get your security group ID
aws ec2 describe-instances --instance-ids YOUR_INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId'

# Add rule for port 8080
aws ec2 authorize-security-group-ingress \
    --group-id YOUR_SECURITY_GROUP_ID \
    --protocol tcp \
    --port 8080 \
    --cidr 0.0.0.0/0 \
    --region YOUR_REGION
```

## 2. SSH into EC2 Instance
```bash
ssh -i your-key.pem ec2-user@your-ec2-public-ip
# or for Ubuntu AMI:
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

## 3. Quick Deploy (One Command)
```bash
# Clone and deploy
git clone https://github.com/yourusername/wizard.git && \
cd wizard/backend && \
sudo ./quick-deploy.sh
```

## 4. Test Deployment
```bash
# From EC2 instance
curl http://localhost:8080/health

# From your local machine (using EC2 public IP)
curl http://YOUR_EC2_PUBLIC_IP:8080/health
```

## 5. Production Setup

### Update .env.production
```bash
sudo nano .env.production
```

Change:
- `ALLOWED_ORIGINS`: Add your frontend domain
- `CONTRACT_PRIVATE_KEY`: Your deployment wallet private key
- Frontend should use: `http://YOUR_EC2_PUBLIC_IP:8080` as API URL

### Restart after changes:
```bash
docker-compose restart
```

## 6. (Optional) Setup Domain with Elastic IP

### Allocate Elastic IP:
```bash
# Allocate new Elastic IP
aws ec2 allocate-address --region YOUR_REGION

# Associate with instance
aws ec2 associate-address \
    --instance-id YOUR_INSTANCE_ID \
    --allocation-id YOUR_ALLOCATION_ID \
    --region YOUR_REGION
```

### Point domain to Elastic IP:
Add A record in your DNS:
```
api.yourdomain.com → YOUR_ELASTIC_IP
```

### Setup HTTPS with nginx:
```bash
# Install nginx and certbot
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx

# Create nginx config
sudo tee /etc/nginx/sites-available/wizard-api << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/wizard-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

## 7. Monitor & Maintain

### View logs:
```bash
docker-compose logs -f
```

### Check resource usage:
```bash
# Docker stats
docker stats

# System resources
htop

# Disk usage
df -h
```

### Auto-restart on reboot:
```bash
# Create systemd service
sudo tee /etc/systemd/system/wizard-backend.service << 'EOF'
[Unit]
Description=Wizard Backend
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/wizard/backend
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable wizard-backend
```

## Common Issues

### Port 8080 not accessible:
1. Check security group rules
2. Check if container is running: `docker ps`
3. Check instance firewall: `sudo iptables -L`

### Container keeps restarting:
```bash
# Check logs
docker-compose logs --tail=50

# Common fix: permissions
sudo chown -R 1000:1000 /data/wizard-projects
```

### Out of disk space:
```bash
# Clean Docker
docker system prune -a
```

## Frontend Configuration

Update your frontend `.env`:
```env
# For HTTP
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP:8080

# For HTTPS (after nginx setup)
VITE_API_URL=https://api.yourdomain.com
```
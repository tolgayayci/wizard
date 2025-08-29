# Remote Deployment Guide

## Prerequisites on Remote Machine
- Ubuntu/Debian Linux (or similar)
- Docker and Docker Compose installed
- Git installed
- Port 8080 open in firewall

## Step-by-Step Deployment

### 1. SSH into your remote machine
```bash
ssh your-user@your-server-ip
```

### 2. Install Docker (if not installed)
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add your user to docker group (optional, to run without sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### 3. Clone the repository
```bash
# Clone your repo (use your actual repo URL)
git clone https://github.com/yourusername/wizard.git
cd wizard/backend
```

### 4. Create production environment file
```bash
# Create .env.production file
cat > .env.production << 'EOF'
# JWT Configuration
JWT_SECRET=your-very-secure-random-jwt-secret-change-this

# Blockchain Configuration
SUPERPOSITION_RPC_URL=https://testnet-rpc.superposition.so
SUPERPOSITION_CHAIN_ID=98985
SUPERPOSITION_EXPLORER_URL=https://testnet-scan.superposition.so
CONTRACT_PRIVATE_KEY=your-wallet-private-key-for-deployments

# CORS Configuration
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Storage Configuration
STORAGE_PATH=/app/projects
MAX_FILE_SIZE=10485760
MAX_PROJECT_SIZE=52428800
EOF

# Edit the file to add your actual values
nano .env.production
```

### 5. Make deploy script executable and run
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

### 6. Verify deployment
```bash
# Check if container is running
docker ps

# Check health endpoint
curl http://localhost:8080/health

# View logs
docker-compose logs -f
```

## Important Configuration Changes

### For Production Domain
Edit `.env.production`:
- Change `ALLOWED_ORIGINS` to your actual domain
- Generate a secure `JWT_SECRET` (use: `openssl rand -base64 32`)
- Add your wallet's `CONTRACT_PRIVATE_KEY` for contract deployments

### For HTTPS (Recommended)
Add nginx reverse proxy with SSL:

1. Install nginx:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. Create nginx config:
```bash
sudo nano /etc/nginx/sites-available/wizard-backend
```

Add:
```nginx
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
    }
}
```

3. Enable site and get SSL:
```bash
sudo ln -s /etc/nginx/sites-available/wizard-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com
```

## Updating Deployment

To update after code changes:
```bash
cd wizard/backend
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Backup Projects

Projects are stored in `/data/wizard-projects`:
```bash
# Backup
sudo tar -czf wizard-projects-backup-$(date +%Y%m%d).tar.gz /data/wizard-projects

# Restore
sudo tar -xzf wizard-projects-backup-20240829.tar.gz -C /
```

## Monitoring

View logs:
```bash
docker-compose logs -f
```

Check disk usage:
```bash
du -sh /data/wizard-projects
```

Check container resource usage:
```bash
docker stats wizard-backend
```

## Troubleshooting

If container fails to start:
```bash
# Check logs
docker-compose logs

# Check if port 8080 is already in use
sudo lsof -i :8080

# Rebuild without cache
docker-compose build --no-cache
```

If permission issues:
```bash
# Fix project directory permissions
sudo chown -R 1000:1000 /data/wizard-projects
```
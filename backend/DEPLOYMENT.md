# Wizard Backend Docker Deployment Guide

## Quick Start

Deploy the Wizard backend to your Linux server in 3 simple steps:

```bash
# 1. Copy files to your server
scp -r backend/ user@your-server:~/wizard-backend/

# 2. SSH to your server
ssh user@your-server

# 3. Run deployment
cd wizard-backend
./deploy.sh
```

## Files Overview

- **Dockerfile** - Builds the backend with Rust 1.88.0 and cargo-stylus 0.6.1
- **docker-compose.yml** - Manages the container and volumes
- **.env.production** - Production environment variables
- **deploy.sh** - Automated deployment script

## Configuration

### 1. Update Environment Variables

Edit `.env.production` and update:
- `ALLOWED_ORIGINS` - Add your frontend domain
- `CONTRACT_PRIVATE_KEY` - Your wallet private key for deployments
- `SUPABASE_*` - Your Supabase credentials (if different)

### 2. Projects Storage Location

By default, projects are stored at `/data/wizard-projects` on the host.

To change this, edit `docker-compose.yml`:
```yaml
volumes:
  - /your/preferred/path:/app/projects
```

## Manual Deployment

If you prefer manual steps:

```bash
# Create projects directory
sudo mkdir -p /data/wizard-projects
sudo chown -R 1000:1000 /data/wizard-projects

# Build image
docker-compose build

# Start container
docker-compose up -d

# Check logs
docker-compose logs -f
```

## Management Commands

```bash
# View logs
docker-compose logs -f

# Stop backend
docker-compose down

# Restart backend
docker-compose restart

# View container status
docker-compose ps

# Enter container shell
docker-compose exec wizard-backend /bin/bash

# Update and rebuild
git pull
docker-compose build
docker-compose up -d
```

## Security Notes

- Backend runs as non-root user (UID 1000)
- Only port 8080 is exposed
- Projects stored outside container for persistence
- No Docker-in-Docker (compilation happens in container)
- No authentication required (as requested)

## Troubleshooting

### Port 8080 already in use
```bash
# Find process using port
sudo lsof -i :8080

# Kill process or change port in docker-compose.yml
```

### Permission issues with projects directory
```bash
# Fix ownership
sudo chown -R 1000:1000 /data/wizard-projects
```

### Container won't start
```bash
# Check logs
docker-compose logs

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## System Requirements

- Linux server (Ubuntu 20.04+ recommended)
- Docker 20.10+
- docker-compose 1.29+
- At least 2GB RAM
- 10GB free disk space

## Testing the Deployment

Once deployed, test the backend:

```bash
# Check health endpoint
curl http://localhost:8080/health

# Expected response:
# {"status":"ok","message":"Wizard backend is running","timestamp":"..."}
```

## Updating

To update the backend:

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d
```

## Backup

Projects are stored at `/data/wizard-projects`. Back up this directory regularly:

```bash
# Create backup
tar -czf wizard-projects-backup-$(date +%Y%m%d).tar.gz /data/wizard-projects
```
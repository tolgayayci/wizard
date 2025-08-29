#!/bin/bash

# Quick Remote Deployment Script
# Run this on your remote server after cloning the repo

set -e  # Exit on error

echo "🚀 Quick Deploy - Wizard Backend"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  This script needs sudo privileges. Re-running with sudo...${NC}"
    exec sudo "$0" "$@"
fi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✅ Docker installed${NC}"
else
    echo -e "${GREEN}✅ Docker already installed${NC}"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    apt-get update
    apt-get install -y docker-compose
    echo -e "${GREEN}✅ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✅ Docker Compose already installed${NC}"
fi

# Create .env.production if it doesn't exist
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}📝 Creating .env.production file...${NC}"
    
    # Generate secure JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    
    cat > .env.production << EOF
# JWT Configuration (Auto-generated - KEEP SECURE!)
JWT_SECRET=$JWT_SECRET

# Blockchain Configuration
SUPERPOSITION_RPC_URL=https://testnet-rpc.superposition.so
SUPERPOSITION_CHAIN_ID=98985
SUPERPOSITION_EXPLORER_URL=https://testnet-scan.superposition.so
CONTRACT_PRIVATE_KEY=0789b59e194094b8f65d3c3979c31838d64fcb06e9266d6e541d40f4a9e310bd

# CORS Configuration (UPDATE WITH YOUR DOMAIN!)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000

# Storage Configuration
STORAGE_PATH=/app/projects
MAX_FILE_SIZE=10485760
MAX_PROJECT_SIZE=52428800
EOF

    echo -e "${GREEN}✅ .env.production created${NC}"
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env.production to:${NC}"
    echo "   1. Update ALLOWED_ORIGINS with your domain"
    echo "   2. Change CONTRACT_PRIVATE_KEY to your wallet key"
else
    echo -e "${GREEN}✅ .env.production already exists${NC}"
fi

# Create projects directory
PROJECTS_DIR="/data/wizard-projects"
if [ ! -d "$PROJECTS_DIR" ]; then
    echo -e "${YELLOW}📁 Creating projects directory...${NC}"
    mkdir -p "$PROJECTS_DIR"
    chown -R 1000:1000 "$PROJECTS_DIR"
    echo -e "${GREEN}✅ Projects directory created${NC}"
else
    echo -e "${GREEN}✅ Projects directory exists${NC}"
fi

# Build and deploy
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker-compose build

echo -e "${YELLOW}🚀 Starting container...${NC}"
docker-compose up -d

# Wait for container to start
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

# Check health
if curl -s http://localhost:8080/health | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend is running successfully!${NC}"
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "================================"
    echo "Backend URL: http://$(hostname -I | awk '{print $1}'):8080"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.production with your settings"
    echo "2. Restart if you changed settings: docker-compose restart"
    echo "3. View logs: docker-compose logs -f"
    echo ""
    echo "For HTTPS setup, see REMOTE_DEPLOY.md"
else
    echo -e "${RED}❌ Health check failed!${NC}"
    echo "Check logs: docker-compose logs"
    exit 1
fi
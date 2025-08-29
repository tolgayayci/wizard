#!/bin/bash

echo "🚀 Deploying Wizard Backend..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose is not installed. Please install docker-compose first.${NC}"
    exit 1
fi

# Create projects directory if it doesn't exist
PROJECTS_DIR="/data/wizard-projects"
echo -e "${YELLOW}📁 Setting up projects directory at ${PROJECTS_DIR}...${NC}"

if [ ! -d "$PROJECTS_DIR" ]; then
    echo "Creating projects directory..."
    sudo mkdir -p "$PROJECTS_DIR"
    sudo chown -R 1000:1000 "$PROJECTS_DIR"
    echo -e "${GREEN}✅ Projects directory created${NC}"
else
    echo -e "${GREEN}✅ Projects directory already exists${NC}"
fi

# Copy production env file if not exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found!${NC}"
    echo "Please create .env.production file with your configuration"
    exit 1
fi

# Build and start the container
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker-compose build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
fi

echo -e "${YELLOW}🚀 Starting container...${NC}"
docker-compose up -d

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to start container!${NC}"
    exit 1
fi

# Show container status
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "Container status:"
docker-compose ps
echo ""

# Show logs
echo -e "${YELLOW}📋 Showing logs (last 20 lines):${NC}"
docker-compose logs --tail=20

echo ""
echo -e "${GREEN}✅ Backend is running at http://localhost:8080${NC}"
echo ""
echo "Useful commands:"
echo "  View logs:        docker-compose logs -f"
echo "  Stop backend:     docker-compose down"
echo "  Restart backend:  docker-compose restart"
echo "  View status:      docker-compose ps"
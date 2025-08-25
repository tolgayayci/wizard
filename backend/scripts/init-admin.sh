#!/bin/bash

# Initialize Admin User Script
# Creates the first admin user for the Wizard Backend

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
API_URL=${API_URL:-"http://localhost:8080"}
ADMIN_EMAIL=""
ADMIN_PASSWORD=""

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

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        --url)
            API_URL="$2"
            shift 2
            ;;
        --help)
            echo "Initialize Admin User for Wizard Backend"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --email EMAIL      Admin email address"
            echo "  --password PASS    Admin password (min 8 chars)"
            echo "  --url URL          API URL (default: http://localhost:8080)"
            echo "  --help             Show this help message"
            echo ""
            echo "Example:"
            echo "  $0 --email admin@example.com --password SecurePass123!"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Interactive mode if no arguments provided
if [ -z "$ADMIN_EMAIL" ]; then
    read -p "Enter admin email: " ADMIN_EMAIL
fi

if [ -z "$ADMIN_PASSWORD" ]; then
    read -s -p "Enter admin password (min 8 chars): " ADMIN_PASSWORD
    echo ""
    read -s -p "Confirm password: " CONFIRM_PASSWORD
    echo ""
    
    if [ "$ADMIN_PASSWORD" != "$CONFIRM_PASSWORD" ]; then
        print_error "Passwords do not match"
        exit 1
    fi
fi

# Validate inputs
if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
    print_error "Password must be at least 8 characters long"
    exit 1
fi

if ! [[ "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
    print_error "Invalid email format"
    exit 1
fi

echo ""
echo "Creating admin user..."
echo "Email: $ADMIN_EMAIL"
echo "API URL: $API_URL"
echo ""

# Create admin user via API
# Note: In production, you might want to create a special endpoint for initial admin creation
# or use a direct database connection

# First, try to register as a normal user
RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASSWORD}\"}" \
    2>/dev/null)

if echo "$RESPONSE" | grep -q '"success":true'; then
    TOKEN=$(echo "$RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
    USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | sed 's/"id":"//')
    
    print_info "User created successfully"
    
    # Note: In production, you would update the user's role to 'admin' in the database
    # This would typically be done through a secure administrative interface
    # or by directly updating the database
    
    print_warning "To make this user an admin, you need to:"
    echo "  1. Access your database"
    echo "  2. Update the user's role to 'admin'"
    echo "  3. SQL: UPDATE users SET role = 'admin' WHERE email = '${ADMIN_EMAIL}';"
    echo ""
    print_info "User Details:"
    echo "  User ID: ${USER_ID}"
    echo "  Email: ${ADMIN_EMAIL}"
    echo "  Token: ${TOKEN}"
    echo ""
    print_info "Save this token for API access"
    
    # Save token to file (optional)
    if [ -w "." ]; then
        echo "$TOKEN" > .admin-token
        chmod 600 .admin-token
        print_info "Token saved to .admin-token (keep this secure!)"
    fi
    
elif echo "$RESPONSE" | grep -q "already exists"; then
    print_warning "User already exists"
else
    print_error "Failed to create user"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
print_info "Admin initialization complete!"
echo ""
echo "Next steps:"
echo "  1. Update the user's role to 'admin' in your database"
echo "  2. Test admin access with the provided token"
echo "  3. Configure additional security settings as needed"
echo ""
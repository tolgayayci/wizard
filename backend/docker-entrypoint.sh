#!/bin/bash
set -e

# Default values
DOMAIN=${DOMAIN:-api.thewizard.app}
EMAIL=${EMAIL:-admin@thewizard.app}

echo "Starting Wizard Backend with Let's Encrypt SSL for domain: $DOMAIN"

# Create certbot webroot directory
mkdir -p /var/www/certbot

# Check if certificates already exist
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Certificates not found. Generating with Let's Encrypt..."
    
    # Start nginx with temporary config for initial cert generation
    cat > /etc/nginx/sites-available/temp <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'Initializing SSL...';
        add_header Content-Type text/plain;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/temp /etc/nginx/sites-enabled/
    nginx -g "daemon off;" &
    NGINX_PID=$!
    
    # Wait for nginx to start
    sleep 5
    
    # Request certificate from Let's Encrypt
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $DOMAIN
    
    # Stop temporary nginx
    kill $NGINX_PID
    wait $NGINX_PID 2>/dev/null || true
    
    echo "SSL certificates generated successfully!"
else
    echo "SSL certificates found for $DOMAIN"
    
    # Try to renew if needed
    certbot renew --webroot --webroot-path=/var/www/certbot --quiet || true
fi

# Update nginx configuration with the actual domain
sed -i "s/api.thewizard.app/$DOMAIN/g" /etc/nginx/sites-available/wizard

# Enable the site
ln -sf /etc/nginx/sites-available/wizard /etc/nginx/sites-enabled/

# Remove default site if it exists
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/temp

# Test nginx configuration
nginx -t

# Setup certificate renewal cron job
echo "0 0,12 * * * root certbot renew --webroot --webroot-path=/var/www/certbot --quiet && nginx -s reload" > /etc/cron.d/certbot-renew

# Start cron service
service cron start

# Start supervisor to manage nginx and backend
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
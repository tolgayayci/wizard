#!/bin/bash
set -e

DOMAIN="api.thewizard.app"
EMAIL="${EMAIL:-admin@thewizard.app}"

echo "Starting Wizard Backend with SSL for $DOMAIN"

# Check if certificates exist
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Getting Let's Encrypt certificate for $DOMAIN..."
    
    # Remove any existing nginx configs that might interfere
    rm -f /etc/nginx/sites-enabled/*
    
    # Create a simple nginx config just for certbot
    cat > /etc/nginx/sites-available/certbot.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 404;
    }
}
EOF
    
    ln -sf /etc/nginx/sites-available/certbot.conf /etc/nginx/sites-enabled/certbot.conf
    
    # Test nginx config
    nginx -t
    
    # Start nginx for certbot
    nginx
    sleep 5
    
    # Test that nginx is serving on port 80
    echo "Testing nginx on port 80..."
    curl -f http://localhost/.well-known/acme-challenge/ || echo "Nginx test path accessible"
    
    # Get certificate
    certbot certonly --webroot -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $DOMAIN || {
            echo "Failed to get certificate, using self-signed as fallback"
            mkdir -p /etc/nginx/ssl
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout /etc/nginx/ssl/privkey.pem \
                -out /etc/nginx/ssl/fullchain.pem \
                -subj "/CN=$DOMAIN"
            
            # Update nginx config to use self-signed
            sed -i 's|/etc/letsencrypt/live/api.thewizard.app/|/etc/nginx/ssl/|g' /etc/nginx/sites-available/wizard
        }
    
    # Stop nginx and clean up
    nginx -s stop || true
    sleep 2
    rm -f /etc/nginx/sites-enabled/certbot.conf
fi

# Setup auto-renewal
echo "0 3 * * * certbot renew --quiet --post-hook 'nginx -s reload'" | crontab -
service cron start

# Start services
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
#!/bin/bash
set -e

DOMAIN="api.thewizard.app"
EMAIL="${EMAIL:-admin@thewizard.app}"

echo "Starting Wizard Backend with SSL for $DOMAIN"

# Check if certificates exist
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Getting Let's Encrypt certificate for $DOMAIN..."
    
    # Start temporary nginx for certbot
    cat > /etc/nginx/sites-enabled/temp.conf <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}
EOF
    
    nginx -g "daemon off;" &
    NGINX_PID=$!
    sleep 3
    
    # Get certificate
    certbot certonly --webroot -w /var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $DOMAIN || {
            echo "Failed to get certificate, using self-signed as fallback"
            openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
                -keyout /etc/nginx/ssl/privkey.pem \
                -out /etc/nginx/ssl/fullchain.pem \
                -subj "/CN=$DOMAIN"
            
            # Update nginx config to use self-signed
            sed -i 's|/etc/letsencrypt/live/api.thewizard.app/|/etc/nginx/ssl/|g' /etc/nginx/sites-available/wizard
        }
    
    kill $NGINX_PID 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/temp.conf
fi

# Setup auto-renewal
echo "0 3 * * * certbot renew --quiet --post-hook 'nginx -s reload'" | crontab -
service cron start

# Start services
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
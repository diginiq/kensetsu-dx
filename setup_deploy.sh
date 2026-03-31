#!/bin/bash
set -e

echo "Restoring Database..."
sudo -u postgres psql kensetsu_dx < /tmp/kensetsu_dx_dump.sql || true

cd /var/www/kensetsu-dx

echo "Restoring env file permissions..."
sudo chown ubuntu:ubuntu .env.local
sudo chmod 644 .env.local

echo "Installing node modules..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Pushing DB schema..."
npx prisma db push --accept-data-loss || true

echo "Building Next.js application..."
npm run build

echo "Starting PM2..."
pm2 delete kensetsu-dx 2>/dev/null || true
pm2 start server.js --name kensetsu-dx --cwd /var/www/kensetsu-dx
pm2 save
pm2 startup | tail -n 1 > pm2_startup.sh
sudo chmod +x pm2_startup.sh
./pm2_startup.sh || true

echo "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/ksdx.jp > /dev/null << 'EOF'
server {
    listen 80;
    server_name ksdx.jp www.ksdx.jp;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Add websocket mapping if not present
if ! grep -q "map \$http_upgrade \$connection_upgrade" /etc/nginx/nginx.conf; then
    sudo sed -i '/http {/a map $http_upgrade $connection_upgrade {\n    default upgrade;\n    ""      close;\n}' /etc/nginx/nginx.conf
fi

sudo ln -sf /etc/nginx/sites-available/ksdx.jp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete."

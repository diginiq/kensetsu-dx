#!/bin/bash
set -e

echo "Updating system..."
sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt install -y postgresql postgresql-contrib nginx certbot python3-certbot-nginx curl git build-essential

echo "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo DEBIAN_FRONTEND=noninteractive apt install -y nodejs

echo "Installing PM2..."
sudo npm install -g pm2

echo "Configuring PostgreSQL..."
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'postgres';" || true
sudo -u postgres psql -c "CREATE DATABASE kensetsu_dx OWNER postgres;" || true

echo "Cloning Repository..."
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www
cd /var/www
if [ ! -d "kensetsu-dx" ]; then
    git clone https://github.com/diginiq/kensetsu-dx.git
fi

echo "Setup script completed."

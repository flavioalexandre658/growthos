#!/bin/bash
set -euo pipefail

echo "==> Updating system"
apt-get update && apt-get upgrade -y

echo "==> Installing Docker"
curl -fsSL https://get.docker.com | sh

echo "==> Installing Docker Compose plugin"
apt-get install -y docker-compose-plugin

echo "==> Creating app directory"
mkdir -p /opt/groware
cd /opt/groware

echo "==> Done! Next steps:"
echo "  1. Copy .env, docker-compose.yml and Caddyfile to /opt/groware/"
echo "  2. Authenticate DOCR: docker login registry.digitalocean.com"
echo "  3. Run: docker compose up -d"
echo "  4. Configure crontab: crontab -e (see scripts/crontab.example)"
echo "  5. Set CRON_SECRET in /etc/environment"
echo "  6. Open firewall: ufw allow 80,443,22/tcp && ufw enable"

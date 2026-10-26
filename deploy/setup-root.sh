#!/usr/bin/env bash
# One-time server setup that needs admin rights. Run it on the VPS as the publisher user:
#   sudo bash ~/adstudio/deploy/setup-root.sh
# Safe to run again: each step skips what is already done.
set -euo pipefail

APP_DIR=/home/publisher/adstudio
APP_USER=publisher
ENV_FILE=$APP_DIR/.env.local

echo "1/5 Installing PostgreSQL and Caddy"
apt-get update -q
apt-get install -y -q postgresql caddy

echo "2/5 Database"
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname = 'adgen'" | grep -q 1; then
  echo "   already exists, skipped"
else
  # A random password, written straight into the app's settings file; it is never shown on screen.
  DB_PASS=$(openssl rand -hex 24)
  sudo -u postgres psql -q -c "CREATE ROLE adgen LOGIN PASSWORD '$DB_PASS'"
  sudo -u postgres createdb -O adgen adgen
  touch "$ENV_FILE"
  echo "DATABASE_URL=postgresql://adgen:$DB_PASS@localhost:5432/adgen" >> "$ENV_FILE"
  echo "   created; its address was saved in $ENV_FILE"
fi
chown "$APP_USER:$APP_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE" # only the publisher user can read the settings

echo "3/5 Caddy (HTTPS and the public address)"
cp "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "4/5 Firewall: opening the web ports 80 and 443 (SSH stays open, remote desktop stays closed)"
ufw allow 80/tcp
ufw allow 443/tcp

echo "5/5 Services for the website and the worker (started after the settings are filled in)"
cp "$APP_DIR/deploy/adstudio-web.service" "$APP_DIR/deploy/adstudio-worker.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable adstudio-web adstudio-worker
# Lets publisher start, stop and restart only these two services without a password, so updates can be deployed.
cat > /etc/sudoers.d/adstudio <<EOF
$APP_USER ALL=(root) NOPASSWD: /usr/bin/systemctl start adstudio-web, /usr/bin/systemctl stop adstudio-web, /usr/bin/systemctl restart adstudio-web, /usr/bin/systemctl start adstudio-worker, /usr/bin/systemctl stop adstudio-worker, /usr/bin/systemctl restart adstudio-worker
EOF
chmod 440 /etc/sudoers.d/adstudio
visudo -cf /etc/sudoers.d/adstudio

echo
echo "Done. Firewall now:"
ufw status | sed -n '1,12p'

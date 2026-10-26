#!/usr/bin/env bash
# Sends the code on this laptop to the VPS and restarts the app. Run from the project folder in Git Bash:
#   bash deploy/update.sh
# Never sends .env files, images (storage/) or node_modules; the server keeps its own.
set -euo pipefail

SERVER=publisher@50.6.203.155
KEY=~/.ssh/adstudio-vps
SSH="ssh -i $KEY -o IdentitiesOnly=yes"

echo "1/3 Copying the code"
tar czf - --exclude=./node_modules --exclude=./.next --exclude=./.git --exclude=./storage --exclude=./preview \
  --exclude='./.env*' --exclude=./tsconfig.tsbuildinfo . | $SSH "$SERVER" 'tar xzf - -C ~/adstudio'

echo "2/3 Installing, updating the database and building (a few minutes on this server)"
$SSH "$SERVER" 'cd ~/adstudio && npm ci --no-audit --no-fund --loglevel=error && npm run -s migrate && NEXT_TELEMETRY_DISABLED=1 npm run -s build > /tmp/adstudio-build.log 2>&1 || { tail -30 /tmp/adstudio-build.log; exit 1; }'

echo "3/3 Restarting (the worker first finishes any post it is sending)"
$SSH "$SERVER" 'sudo -n systemctl restart adstudio-web && sudo -n systemctl restart adstudio-worker && sleep 5 && systemctl is-active adstudio-web adstudio-worker'

echo "Done: https://50-6-203-155.sslip.io"

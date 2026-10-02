#!/usr/bin/env bash
# Build the frontend locally and deploy frontend + backend to EC2.
# The frontend is never built on the server (it's too small); only the static
# dist/ is uploaded. The backend installs production deps and restarts via pm2.
#
# Usage: ./deploy.sh            (frontend + backend)
#        ./deploy.sh frontend   (frontend only)
#        ./deploy.sh backend    (backend only)
set -euo pipefail

KEY="${SSH_KEY:-$HOME/Downloads/2infinity-website.pem}"
HOST="${DEPLOY_HOST:-ubuntu@13.201.129.90}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-all}"
SSH="ssh -i $KEY"

if [[ "$TARGET" == "all" || "$TARGET" == "frontend" ]]; then
  echo "▶ Building frontend"
  (cd "$ROOT/frontend" && npm run build)
  echo "▶ Uploading frontend → /var/www/finance-tracker"
  rsync -az --delete -e "$SSH" "$ROOT/frontend/dist/" "$HOST:/var/www/finance-tracker/"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "backend" ]]; then
  echo "▶ Uploading backend → ~/finance-tracker/backend"
  rsync -az --delete -e "$SSH" --exclude node_modules --exclude '*.log' \
    "$ROOT/backend/" "$HOST:~/finance-tracker/backend/"
  echo "▶ Installing deps and restarting finance-backend"
  $SSH "$HOST" 'cd ~/finance-tracker/backend && chmod 600 .env && npm ci --omit=dev --no-audit --no-fund \
    && pm2 restart finance-backend --update-env && pm2 save'
fi

echo "▶ Health check"
curl -fsS https://finance.mypgmanager.com/api/health && echo && echo "✔ Deployed"

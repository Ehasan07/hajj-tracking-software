#!/bin/sh
# Install or update the app on the server. Run from the repository root:
#
#   sh deploy/deploy.sh hajj.takatracker.com          # first time: makes deploy/.env with fresh secrets
#   sh deploy/deploy.sh                               # later: pull, rebuild, migrate, restart
#
# Set PROXY=caddy (default) to let the bundled Caddy take ports 80/443 and get
# the HTTPS certificate, or PROXY=host when the server already runs nginx/Caddy
# and should forward the domain to 127.0.0.1:${WEB_PORT}.
set -eu
cd "$(dirname "$0")/.."
ENV_FILE=deploy/.env
PROXY=${PROXY:-caddy}

if [ ! -f "$ENV_FILE" ]; then
  DOMAIN=${1:?first run: give the domain, e.g. sh deploy/deploy.sh hajj.example.com}
  secret() { openssl rand -base64 32 | tr -d '\n'; }
  word() { openssl rand -hex 24; }
  umask 077
  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
POSTGRES_PASSWORD=$(word)
HAJJ_APP_PASSWORD=$(word)
S3_ACCESS_KEY=hajj$(openssl rand -hex 6)
S3_SECRET_KEY=$(word)
BETTER_AUTH_SECRET=$(secret)
FIELD_ENCRYPTION_KEY=$(secret)
BLIND_INDEX_KEY=$(secret)
PUBLIC_TENANT_SLUG=
WEB_PORT=3100
EOF
  echo "Created $ENV_FILE with new secrets. Back it up somewhere safe: without FIELD_ENCRYPTION_KEY the encrypted passport numbers cannot be read."
fi

if [ -d .git ]; then git pull --ff-only; fi
mkdir -p deploy/backups

COMPOSE="docker compose -f deploy/docker-compose.prod.yml --env-file $ENV_FILE"
if [ "$PROXY" = "caddy" ]; then COMPOSE="$COMPOSE --profile proxy"; fi

$COMPOSE build
$COMPOSE up -d
$COMPOSE ps

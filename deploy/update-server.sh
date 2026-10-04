#!/bin/sh
# Ship the current code to a server that runs the app natively (systemd +
# nginx + the server's own PostgreSQL), as on hajj.takatracker.com:
#
#   sh deploy/update-server.sh root@46.225.148.245
#
# The build happens here, in Docker, so the server's memory is left to the
# other services it runs. Migrations run from here through an SSH tunnel.
# Server layout: /opt/hajj/{app,.env,storage,backups,ops}, services hajj and
# hajj-storage. The app listens on localhost:3100 (IPv6 loopback on that box);
# nginx forwards hajj.takatracker.com to it.
set -eu
TARGET=${1:?usage: sh deploy/update-server.sh user@host}
cd "$(dirname "$0")/.."
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"; pkill -f "5441:127.0.0.1:5432" 2>/dev/null || true' EXIT

echo "1/5 build"
docker buildx build --platform linux/amd64 --target web -t hajj-web:release --load . >/dev/null
cid=$(docker create hajj-web:release)
docker cp "$cid:/app" "$WORK/app"
docker rm "$cid" >/dev/null
tar -czf "$WORK/app.tgz" -C "$WORK/app" .

echo "2/5 backup on the server"
ssh "$TARGET" /opt/hajj/ops/backup.sh

echo "3/5 migrate"
PW=$(ssh "$TARGET" "grep -m1 '^DB_OWNER_PASSWORD=' /opt/hajj/.env | cut -d= -f2-")
ssh -o ExitOnForwardFailure=yes -fN -L 5441:127.0.0.1:5432 "$TARGET"
(cd packages/db && DATABASE_OWNER_URL="postgres://hajj_owner:${PW}@127.0.0.1:5441/hajj" npx tsx src/migrate.ts 2>&1 | grep -v NOTICE | tail -1)

echo "4/5 upload and switch"
scp -q "$WORK/app.tgz" "$TARGET:/tmp/hajj-app.tgz"
ssh "$TARGET" 'set -e
  rm -rf /opt/hajj/app.new && mkdir -p /opt/hajj/app.new
  tar -xzf /tmp/hajj-app.tgz -C /opt/hajj/app.new && rm /tmp/hajj-app.tgz
  chown -R hajj:hajj /opt/hajj/app.new
  rm -rf /opt/hajj/app.old && mv /opt/hajj/app /opt/hajj/app.old && mv /opt/hajj/app.new /opt/hajj/app
  systemctl restart hajj'

echo "5/5 check"
sleep 3
ssh "$TARGET" 'curl -s -o /dev/null -w "app: %{http_code}\n" http://localhost:3100/sign-in'
echo "Done. To roll back: ssh $TARGET \"mv /opt/hajj/app /opt/hajj/app.bad && mv /opt/hajj/app.old /opt/hajj/app && systemctl restart hajj\""

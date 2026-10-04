#!/bin/sh
# Runs once, when the database volume is first created: give the runtime role
# its production password (init.sql creates it with the development one).
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_password="$HAJJ_APP_PASSWORD" <<'SQL'
ALTER ROLE hajj_app PASSWORD :'app_password';
SQL

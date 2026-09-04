#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" \
  --set=freshrss_password="$FRESHRSS_DB_PASSWORD" <<'SQL'
CREATE ROLE freshrss LOGIN PASSWORD :'freshrss_password' CONNECTION LIMIT 20;
CREATE DATABASE freshrss OWNER freshrss;
SQL

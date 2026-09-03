#!/bin/sh
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" \
  --set=healthchecks_password="$HEALTHCHECKS_DB_PASSWORD" \
  --set=freshrss_password="$FRESHRSS_DB_PASSWORD" \
  --set=wakapi_password="$WAKAPI_DB_PASSWORD" \
  --set=crabfit_password="$CRABFIT_DB_PASSWORD" <<'SQL'
CREATE ROLE healthchecks LOGIN PASSWORD :'healthchecks_password' CONNECTION LIMIT 20;
CREATE DATABASE healthchecks OWNER healthchecks;
CREATE ROLE freshrss LOGIN PASSWORD :'freshrss_password' CONNECTION LIMIT 20;
CREATE DATABASE freshrss OWNER freshrss;
CREATE ROLE wakapi LOGIN PASSWORD :'wakapi_password' CONNECTION LIMIT 20;
CREATE DATABASE wakapi OWNER wakapi;
CREATE ROLE crabfit LOGIN PASSWORD :'crabfit_password' CONNECTION LIMIT 20;
CREATE DATABASE crabfit OWNER crabfit;
SQL

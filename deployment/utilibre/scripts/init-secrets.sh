#!/bin/sh
set -eu
umask 077

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
bind_ip=${1:-}
smtp_relay_ip=${SMTP_RELAY_IP:-}
healthchecks_admin_email=${HEALTHCHECKS_ADMIN_EMAIL:-}
freshrss_admin_username=${FRESHRSS_ADMIN_USERNAME:-}
wakapi_admin_username=${WAKAPI_ADMIN_USERNAME:-}

if [ -t 0 ]; then
  if [ -z "$smtp_relay_ip" ]; then
    printf 'Private SMTP relay IPv4: ' >&2
    IFS= read -r smtp_relay_ip
  fi
  if [ -z "$healthchecks_admin_email" ]; then
    printf 'Healthchecks owner email: ' >&2
    IFS= read -r healthchecks_admin_email
  fi
  if [ -z "$freshrss_admin_username" ]; then
    printf 'FreshRSS admin username: ' >&2
    IFS= read -r freshrss_admin_username
  fi
  if [ -z "$wakapi_admin_username" ]; then
    printf 'Wakapi admin username: ' >&2
    IFS= read -r wakapi_admin_username
  fi
fi

if [ -z "$bind_ip" ] || [ -z "$smtp_relay_ip" ] || [ -z "$healthchecks_admin_email" ] ||
   [ -z "$freshrss_admin_username" ] || [ -z "$wakapi_admin_username" ]; then
  echo "Usage: set SMTP_RELAY_IP, HEALTHCHECKS_ADMIN_EMAIL, FRESHRSS_ADMIN_USERNAME," >&2
  echo "       and WAKAPI_ADMIN_USERNAME; then run: $0 APP_BIND_IP" >&2
  exit 2
fi

case "$bind_ip" in
  10.*|192.168.*|172.16.*|172.17.*|172.18.*|172.19.*|172.2?.*|172.30.*|172.31.*) ;;
  *) echo "Refusing non-RFC1918 APP_BIND_IP" >&2; exit 1 ;;
esac

case "$smtp_relay_ip" in
  10.*|192.168.*|172.16.*|172.17.*|172.18.*|172.19.*|172.2?.*|172.30.*|172.31.*) ;;
  *) echo "Refusing non-RFC1918 SMTP_RELAY_IP" >&2; exit 1 ;;
esac

case "$healthchecks_admin_email" in
  *@*.*) ;;
  *) echo "HEALTHCHECKS_ADMIN_EMAIL must look like an email address" >&2; exit 1 ;;
esac

validate_username() {
  case "$1" in
    ''|*[!A-Za-z0-9._-]*)
      echo "$2 may contain only letters, numbers, dot, underscore, and hyphen" >&2
      exit 1
      ;;
  esac
}

validate_username "$freshrss_admin_username" FRESHRSS_ADMIN_USERNAME
validate_username "$wakapi_admin_username" WAKAPI_ADMIN_USERNAME

env_file="$root_dir/.env"
credential_file="$root_dir/secrets/admin-credentials.txt"

if [ -e "$env_file" ] || [ -e "$credential_file" ]; then
  echo "Refusing to overwrite existing secrets" >&2
  exit 1
fi

random_secret() {
  openssl rand -base64 48 | tr -d '\n' | tr '/+' '_-'
}

postgres_admin_password=$(random_secret)
healthchecks_db_password=$(random_secret)
freshrss_db_password=$(random_secret)
wakapi_db_password=$(random_secret)
crabfit_db_password=$(random_secret)
healthchecks_secret_key=$(random_secret)
healthchecks_admin_password=$(random_secret)
freshrss_admin_password=$(random_secret)
freshrss_api_password=$(random_secret)
wakapi_admin_password=$(random_secret)
wakapi_password_salt=$(random_secret)
crabfit_cron_key=$(random_secret)
ntfy_admin_topic="utilibre-admin-$(openssl rand -hex 24)"
created_at=$(date -u --iso-8601=seconds)

cat > "$env_file" <<EOF
APP_BIND_IP=$bind_ip
EDGE_PROXY_IP=
SMTP_RELAY_IP=$smtp_relay_ip
TZ=America/Guatemala
DONATION_URL=

NTFY_PORT=2586
NTFY_ADMIN_TOPIC=$ntfy_admin_topic
BENTOPDF_PORT=3101
VERT_PORT=3102
OMNITOOLS_PORT=3103
HEALTHCHECKS_PORT=3104
PAIRDROP_PORT=3105
FRESHRSS_PORT=3106
RSSHUB_PORT=3107
PRIVATEBIN_PORT=3108
WAKAPI_PORT=3109
CRABFIT_FRONTEND_PORT=3110
CRABFIT_API_PORT=3111

POSTGRES_ADMIN_PASSWORD=$postgres_admin_password
HEALTHCHECKS_DB_PASSWORD=$healthchecks_db_password
FRESHRSS_DB_PASSWORD=$freshrss_db_password
WAKAPI_DB_PASSWORD=$wakapi_db_password
CRABFIT_DB_PASSWORD=$crabfit_db_password
HEALTHCHECKS_SECRET_KEY=$healthchecks_secret_key
HEALTHCHECKS_ADMIN_EMAIL=$healthchecks_admin_email
HEALTHCHECKS_ADMIN_PASSWORD=$healthchecks_admin_password
FRESHRSS_ADMIN_USERNAME=$freshrss_admin_username
FRESHRSS_ADMIN_PASSWORD=$freshrss_admin_password
FRESHRSS_API_PASSWORD=$freshrss_api_password
WAKAPI_ADMIN_USERNAME=$wakapi_admin_username
WAKAPI_ADMIN_PASSWORD=$wakapi_admin_password
WAKAPI_PASSWORD_SALT=$wakapi_password_salt
WAKAPI_ALLOW_SIGNUP=false
CRABFIT_CRON_KEY=$crabfit_cron_key
EOF

cat > "$credential_file" <<EOF
WARNING: THIS FILE CONTAINS UTILIBRE OWNER CREDENTIALS.
Keep it root-only, never commit it, and move an encrypted copy off this VM.
Created: $created_at

[Healthchecks]
Administration URL: https://monitor.utilibre.org/accounts/login/
Username/email: $healthchecks_admin_email
Password: $healthchecks_admin_password
Mail delivery: configured through the deployment SMTP relay; registration remains closed.

[FreshRSS]
Administration URL: https://rss.utilibre.org/i/?c=user&a=profile
Username: $freshrss_admin_username
Password: $freshrss_admin_password
API password: $freshrss_api_password

[Wakapi]
Administration URL: https://wakapi.utilibre.org/settings
Username: $wakapi_admin_username
Password: $wakapi_admin_password

[ntfy administrative alert topic]
Topic URL: https://notify.utilibre.org/$ntfy_admin_topic
Purpose: owner-only operational alerts; do not publish or add to the portal.
EOF

chmod 0600 "$env_file" "$credential_file"
unset postgres_admin_password healthchecks_db_password freshrss_db_password
unset wakapi_db_password crabfit_db_password healthchecks_secret_key
unset healthchecks_admin_password freshrss_admin_password freshrss_api_password
unset wakapi_admin_password wakapi_password_salt crabfit_cron_key ntfy_admin_topic
unset smtp_relay_ip healthchecks_admin_email freshrss_admin_username wakapi_admin_username

echo "Secrets initialized without printing their values."

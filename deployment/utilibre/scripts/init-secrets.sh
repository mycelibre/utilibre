#!/bin/sh
set -eu
umask 077

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
bind_ip=${1:-}
freshrss_admin_username=${FRESHRSS_ADMIN_USERNAME:-}

if [ -t 0 ] && [ -z "$freshrss_admin_username" ]; then
  printf 'FreshRSS admin username: ' >&2
  IFS= read -r freshrss_admin_username
fi

if [ -z "$bind_ip" ] || [ -z "$freshrss_admin_username" ]; then
  echo "Usage: set FRESHRSS_ADMIN_USERNAME; then run: $0 APP_BIND_IP" >&2
  exit 2
fi

case "$bind_ip" in
  10.*|192.168.*|172.16.*|172.17.*|172.18.*|172.19.*|172.2?.*|172.30.*|172.31.*) ;;
  *) echo "Refusing non-RFC1918 APP_BIND_IP" >&2; exit 1 ;;
esac

username_length=${#freshrss_admin_username}
if [ "$username_length" -lt 1 ] || [ "$username_length" -gt 39 ]; then
	echo "FRESHRSS_ADMIN_USERNAME must contain 1 to 39 characters" >&2
	exit 1
fi
case "$freshrss_admin_username" in
	_|[!A-Za-z0-9_]*|*[!A-Za-z0-9_.@-]*)
		echo "FRESHRSS_ADMIN_USERNAME is not accepted by FreshRSS" >&2
		exit 1
		;;
esac
unset username_length

env_file="$root_dir/.env"
credential_file="$root_dir/secrets/admin-credentials.txt"

if [ -e "$env_file" ] || [ -e "$credential_file" ]; then
  echo "Refusing to overwrite existing secrets" >&2
  exit 1
fi

mkdir -p "$root_dir/secrets"
chmod 0700 "$root_dir/secrets"

random_secret() {
  openssl rand -base64 48 | tr -d '\n' | tr '/+' '_-'
}

postgres_admin_password=$(random_secret)
freshrss_db_password=$(random_secret)
freshrss_admin_password=$(random_secret)
freshrss_api_password=$(random_secret)
created_at=$(date -u --iso-8601=seconds)

cat > "$env_file" <<EOF
APP_BIND_IP=$bind_ip
EDGE_PROXY_IP=
TZ=America/Guatemala

FRESHRSS_PORT=3106
FRESHRSS_BASE_URL=https://rss.utilibre.org
PRIVATEBIN_PORT=3108

POSTGRES_ADMIN_PASSWORD=$postgres_admin_password
FRESHRSS_DB_PASSWORD=$freshrss_db_password
FRESHRSS_ADMIN_USERNAME=$freshrss_admin_username
FRESHRSS_ADMIN_PASSWORD=$freshrss_admin_password
FRESHRSS_API_PASSWORD=$freshrss_api_password
EOF

cat > "$credential_file" <<EOF
WARNING: THIS FILE CONTAINS UTILIBRE OWNER CREDENTIALS.
Keep it root-only, never commit it, and move an encrypted copy off this VM.
Created: $created_at

[FreshRSS]
Administration URL: https://rss.utilibre.org/i/?c=user&a=profile
Username: $freshrss_admin_username
Password: $freshrss_admin_password
API password: $freshrss_api_password
EOF

chmod 0600 "$env_file" "$credential_file"
unset postgres_admin_password freshrss_db_password
unset freshrss_admin_password freshrss_api_password
unset freshrss_admin_username

echo "Secrets initialized without printing their values."

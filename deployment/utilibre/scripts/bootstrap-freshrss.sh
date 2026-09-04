#!/bin/sh
set -eu
set +x
umask 077

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
env_file="$root_dir/.env"
container_helper="$root_dir/scripts/freshrss-bootstrap-container.sh"
lock_file="$root_dir/secrets/freshrss-bootstrap.lock"

fail() {
	echo "FreshRSS bootstrap: $*" >&2
	exit 1
}

[ -r "$env_file" ] || fail "missing root-only $env_file; run scripts/init-secrets.sh first"
[ -r "$container_helper" ] || fail "missing container bootstrap helper"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v flock >/dev/null 2>&1 || fail "flock is required"

env_mode=$(stat -c '%a' "$env_file") || fail "could not inspect .env permissions"
case "$env_mode" in
	400|600 ) ;;
	* ) fail ".env must be readable only by its owner (mode 0400 or 0600)" ;;
esac
unset env_mode

read_env() {
	key=$1
	value=$(awk -v key="$key" '
		index($0, key "=") == 1 {
			print substr($0, length(key) + 2)
			found = 1
			exit
		}
		END { if (!found) exit 1 }
	' "$env_file") || fail "missing $key in .env"
	[ -n "$value" ] || fail "$key is empty in .env"
	printf '%s' "$value"
	unset key value
}

read_env_optional() {
	key=$1
	awk -v key="$key" '
		index($0, key "=") == 1 {
			print substr($0, length(key) + 2)
			exit
		}
	' "$env_file"
	unset key
}

app_bind_ip=$(read_env APP_BIND_IP)
edge_proxy_ip=$(read_env EDGE_PROXY_IP)
admin_username=$(read_env FRESHRSS_ADMIN_USERNAME)
database_password=$(read_env FRESHRSS_DB_PASSWORD)
admin_password=$(read_env FRESHRSS_ADMIN_PASSWORD)
api_password=$(read_env FRESHRSS_API_PASSWORD)
base_url=$(read_env_optional FRESHRSS_BASE_URL)
[ -n "$base_url" ] || base_url=https://rss.utilibre.org

case "$app_bind_ip" in
	10.*|192.168.*|172.16.*|172.17.*|172.18.*|172.19.*|172.2?.*|172.30.*|172.31.* ) ;;
	* ) fail "APP_BIND_IP must be an RFC1918 address" ;;
esac
case "$edge_proxy_ip" in
	10.*|192.168.*|172.16.*|172.17.*|172.18.*|172.19.*|172.2?.*|172.30.*|172.31.* ) ;;
	* ) fail "EDGE_PROXY_IP must be an exact RFC1918 address" ;;
esac
case "$base_url" in
	https://* ) ;;
	* ) fail "FRESHRSS_BASE_URL must use HTTPS" ;;
esac

username_length=${#admin_username}
if [ "$username_length" -lt 1 ] || [ "$username_length" -gt 39 ]; then
	fail "FRESHRSS_ADMIN_USERNAME must contain 1 to 39 characters"
fi
case "$admin_username" in
	_|[!A-Za-z0-9_]*|*[!A-Za-z0-9_.@-]* )
		fail "FRESHRSS_ADMIN_USERNAME is not accepted by FreshRSS"
		;;
esac
unset username_length

mkdir -p "$root_dir/secrets"
chmod 0700 "$root_dir/secrets"
exec 9>"$lock_file"
if ! flock -n 9; then
	fail "another FreshRSS bootstrap is already running"
fi

cd "$root_dir"
echo "Starting the FreshRSS database."
docker compose up --detach --wait postgres

echo "Checking the FreshRSS installation and operator account."
{
	printf '%s\n' "$admin_username"
	printf '%s\n' "$database_password"
	printf '%s\n' "$admin_password"
	printf '%s\n' "$api_password"
} | docker compose run --rm --no-deps -T \
	--env FRESHRSS_BASE_URL="$base_url" \
	--volume "$container_helper:/usr/local/sbin/utilibre-freshrss-bootstrap:ro" \
	freshrss /usr/local/sbin/utilibre-freshrss-bootstrap

unset admin_username database_password admin_password api_password base_url
unset app_bind_ip edge_proxy_ip

echo "Starting FreshRSS and waiting for its health check."
docker compose up --detach --wait freshrss
echo "FreshRSS bootstrap complete. No credential values were printed."

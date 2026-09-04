#!/bin/sh
set -eu
set +x

fresh_root=${FRESHRSS_ROOT:-/var/www/FreshRSS}
php_bin=${PHP_BIN:-php}
config_file="$fresh_root/data/config.php"
migration_file="$fresh_root/data/applied_migrations.txt"

fail() {
	echo "FreshRSS bootstrap: $*" >&2
	exit 1
}

IFS= read -r admin_username && [ -n "$admin_username" ] || fail "missing operator username input"
IFS= read -r database_password && [ -n "$database_password" ] || fail "missing database password input"
IFS= read -r admin_password && [ -n "$admin_password" ] || fail "missing operator password input"
IFS= read -r api_password && [ -n "$api_password" ] || fail "missing API password input"

base_url=${FRESHRSS_BASE_URL:-https://rss.utilibre.org}

username_length=${#admin_username}
if [ "$username_length" -lt 1 ] || [ "$username_length" -gt 39 ]; then
	fail "operator username must contain 1 to 39 characters"
fi
case "$admin_username" in
	_|[!A-Za-z0-9_]*|*[!A-Za-z0-9_.@-]* ) fail "operator username is not accepted by FreshRSS" ;;
esac
unset username_length

case "$base_url" in
	https://* ) ;;
	* ) fail "FRESHRSS_BASE_URL must use HTTPS" ;;
esac

if [ -e "$config_file" ] && [ ! -e "$migration_file" ]; then
	fail "configuration exists without the migration marker; refusing to guess"
fi

if [ -e "$migration_file" ]; then
	[ -f "$config_file" ] || fail "migration marker exists without configuration"
	configured_default=$(
		"$php_bin" -r '
			$config = include $argv[1];
			if (!is_array($config) || !is_string($config["default_user"] ?? null)) {
				exit(2);
			}
			echo $config["default_user"];
		' "$config_file"
	) || fail "could not read the installed default user"
	[ "$configured_default" = "$admin_username" ] ||
		fail "installed default user differs from the generated operator account; no changes made"
	unset configured_default
	echo "FreshRSS installation already exists; configuration preserved."
else
	"$php_bin" -f "$fresh_root/cli/do-install.php" -- \
		--default-user "$admin_username" \
		--auth-type form \
		--environment production \
		--base-url "$base_url" \
		--language en \
		--title "Utilibre FreshRSS" \
		--api-enabled \
		--disable-update \
		--db-type pgsql \
		--db-host postgres \
		--db-user freshrss \
		--db-password "$database_password" \
		--db-base freshrss \
		--db-prefix freshrss_ >/dev/null
	echo "FreshRSS installation created."
fi

users=$("$php_bin" -f "$fresh_root/cli/list-users.php") ||
	fail "could not inspect FreshRSS users"

if printf '%s\n' "$users" | grep -Fqx "$admin_username"; then
	echo "FreshRSS operator account already exists; account settings preserved."
else
	"$php_bin" -f "$fresh_root/cli/create-user.php" -- \
		--user "$admin_username" \
		--password "$admin_password" \
		--api-password "$api_password" \
		--language en \
		--no-default-feeds >/dev/null
	echo "FreshRSS operator account created."
fi

unset admin_username database_password admin_password api_password base_url users

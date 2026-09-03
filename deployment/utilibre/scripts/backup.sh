#!/bin/sh
set -eu
umask 077

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
set -a
# shellcheck disable=SC1091
. "$root_dir/.env"
set +a
backup_root="$root_dir/data/backups"
timestamp=$(date -u +%Y%m%d-%H%M%S)
final_dir="$backup_root/daily-$timestamp"
incomplete_dir=$(mktemp -d "$backup_root/.incomplete-$timestamp.XXXXXX")
log_file="$incomplete_dir/backup.log"

ping_monitor() {
  suffix=${1:-}
  [ -n "${BACKUP_HEALTHCHECK_PATH:-}" ] || return 0
  if ! curl -fsS -o /dev/null --connect-timeout 3 --max-time 10 \
    -H 'Host: monitor.utilibre.org' -H 'X-Forwarded-Proto: https' \
    "http://${APP_BIND_IP}:${HEALTHCHECKS_PORT}${BACKUP_HEALTHCHECK_PATH}${suffix}"; then
    echo "Warning: could not update the local backup monitor" >&2
  fi
}

notify_owner() {
  [ -n "${NTFY_ADMIN_TOPIC:-}" ] || return 0
  if ! curl -fsS -o /dev/null --connect-timeout 3 --max-time 10 \
    -H 'Title: Utilibre backup failed' -H 'Priority: high' \
    --data 'The nightly local backup failed. Review the root-only backup log on the application VM.' \
    "http://${APP_BIND_IP}:${NTFY_PORT}/${NTFY_ADMIN_TOPIC}"; then
    echo "Warning: could not send the local ntfy failure alert" >&2
  fi
}

cleanup() {
  status=$?
  if [ "$status" -ne 0 ]; then
    ping_monitor /fail
    notify_owner
  fi
  if [ "$status" -ne 0 ] && [ -d "$incomplete_dir" ]; then
    if [ -f "$log_file" ]; then
      cp "$log_file" "$backup_root/failed-$timestamp.log"
      chmod 0600 "$backup_root/failed-$timestamp.log"
    fi
    rm -rf -- "$incomplete_dir"
  elif [ "$status" -ne 0 ] && [ -f "$final_dir/backup.log" ]; then
    cp "$final_dir/backup.log" "$backup_root/failed-$timestamp.log"
    chmod 0600 "$backup_root/failed-$timestamp.log"
  fi
  exit "$status"
}
trap cleanup EXIT HUP INT TERM

exec 9>"$backup_root/.backup.lock"
if ! flock -n 9; then
  echo "Another Utilibre backup is already running" >&2
  exit 1
fi

cd "$root_dir"
exec >"$log_file" 2>&1
echo "Backup started: $(date -u --iso-8601=seconds)"
ping_monitor /start

mkdir -p "$incomplete_dir/postgres" "$incomplete_dir/files"
for database in healthchecks freshrss wakapi crabfit; do
  docker compose exec -T postgres pg_dump -U postgres -Fc "$database" > "$incomplete_dir/postgres/$database.dump"
done

tar -C "$root_dir" -czf "$incomplete_dir/files/configuration.tar.gz" \
  compose.yaml .env .env.example README.md SOURCE_MANIFEST.md config scripts system systemd edge portal docs secrets
# ntfy messages and attachments are expiring caches. Neither is copied into
# longer-lived backups; its configuration is already in configuration.tar.gz.
tar -C "$root_dir/data" -czf "$incomplete_dir/files/freshrss-data.tar.gz" freshrss
tar -C "$root_dir/data" -czf "$incomplete_dir/files/privatebin-data.tar.gz" privatebin

(cd "$incomplete_dir" && find postgres files -type f -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS)
echo "Backup completed: $(date -u --iso-8601=seconds)"
mv "$incomplete_dir" "$final_dir"
incomplete_dir=
ping_monitor

if [ "$(date -u +%u)" -eq 7 ]; then
  cp -al "$final_dir" "$backup_root/weekly-$timestamp"
fi

find "$backup_root" -maxdepth 1 -type d -name 'daily-*' -printf '%T@ %p\n' | sort -nr | awk 'NR>7 {print $2}' | while IFS= read -r old; do rm -rf -- "$old"; done
find "$backup_root" -maxdepth 1 -type d -name 'weekly-*' -printf '%T@ %p\n' | sort -nr | awk 'NR>4 {print $2}' | while IFS= read -r old; do rm -rf -- "$old"; done

trap - EXIT HUP INT TERM
printf '%s\n' "$final_dir"

#!/bin/sh
set -u

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir" || exit 1

if [ -r .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

failed=0

for service in postgres valkey freshrss rsshub privatebin; do
  cid=$(docker compose ps -q "$service" 2>/dev/null || true)
  if [ -z "$cid" ]; then
    printf '%-12s FAIL missing container\n' "$service"
    failed=1
    continue
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$cid")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")
  if [ "$state" != running ] || { [ "$health" != healthy ] && [ "$health" != none ]; }; then
    printf '%-12s FAIL state=%s health=%s\n' "$service" "$state" "$health"
    failed=1
  else
    printf '%-12s state=%s health=%s\n' "$service" "$state" "$health"
  fi
done

check_http() {
  name=$1
  url=$2
  host=$3
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 12 \
    -H "Host: $host" -H 'X-Forwarded-Proto: https' "$url" 2>/dev/null || true)
  case "$code" in
    2??|3??) printf '%-12s HTTP %s\n' "$name" "$code" ;;
    *) printf '%-12s FAIL HTTP %s\n' "$name" "${code:-000}"; failed=1 ;;
  esac
}

check_http freshrss "http://${APP_BIND_IP}:${FRESHRSS_PORT}/i/" rss.utilibre.org
check_http privatebin "http://${APP_BIND_IP}:${PRIVATEBIN_PORT}/" paste.utilibre.org

if ! docker compose exec -T freshrss php -r \
  '$body = @file_get_contents("http://rsshub:1200/healthz"); exit($body === false ? 1 : 0);'; then
  echo "rsshub internal reachability FAIL"
  failed=1
else
  echo "rsshub internal reachability OK"
fi

databases=$(docker compose exec -T postgres psql -U postgres -Atqc \
  "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY datname" 2>/dev/null || true)
if [ "$databases" != freshrss ]; then
  echo "postgres application databases FAIL"
  failed=1
else
  echo "postgres application databases OK"
fi

if [ "$(docker compose exec -T valkey valkey-cli ping 2>/dev/null || true)" != PONG ]; then
  echo "valkey FAIL"
  failed=1
else
  echo "valkey OK"
fi

disk_free=$(df -P "$root_dir" | awk 'NR==2 {gsub("%", "", $5); print 100-$5}')
if [ "${disk_free:-0}" -lt 10 ]; then
  echo "disk free FAIL: ${disk_free:-0}%"
  failed=1
else
  echo "disk free OK: ${disk_free}%"
fi

mem_available=$(awk '/MemAvailable:/ {print $2}' /proc/meminfo)
mem_total=$(awk '/MemTotal:/ {print $2}' /proc/meminfo)
mem_percent=$((mem_available * 100 / mem_total))
if [ "$mem_percent" -lt 15 ]; then
  echo "memory available FAIL: ${mem_percent}%"
  failed=1
else
  echo "memory available OK: ${mem_percent}%"
fi

newest_backup=$(find "$root_dir/data/backups" -maxdepth 1 -type d -name 'daily-*' -mtime -2 -print -quit 2>/dev/null)
if [ -z "$newest_backup" ]; then
  echo "backup freshness FAIL: no daily backup newer than 48 hours"
  failed=1
else
  echo "backup freshness OK"
fi

exit "$failed"

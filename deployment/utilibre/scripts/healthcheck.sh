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
check_http() {
  name=$1
  url=$2
  host=$3
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 3 --max-time 12 \
    -H "Host: $host" -H 'X-Forwarded-Proto: https' "$url" 2>/dev/null || true)
  case "$code" in
    2??|3??) printf '%-14s HTTP %s\n' "$name" "$code" ;;
    *) printf '%-14s FAIL HTTP %s\n' "$name" "${code:-000}"; failed=1 ;;
  esac
}

for service in postgres valkey ntfy bentopdf vert omnitools healthchecks pairdrop freshrss rsshub privatebin wakapi; do
  cid=$(docker compose ps -q "$service" 2>/dev/null || true)
  if [ -z "$cid" ]; then
    printf '%-14s FAIL missing container\n' "$service"
    failed=1
    continue
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$cid")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")
  if [ "$state" != running ] || { [ "$health" != healthy ] && [ "$health" != none ]; }; then
    printf '%-14s FAIL state=%s health=%s\n' "$service" "$state" "$health"
    failed=1
  else
    printf '%-14s state=%s health=%s\n' "$service" "$state" "$health"
  fi
done

check_http ntfy "http://${APP_BIND_IP}:${NTFY_PORT}/v1/health" notify.utilibre.org
check_http bentopdf "http://${APP_BIND_IP}:${BENTOPDF_PORT}/" pdf.utilibre.org
check_http vert "http://${APP_BIND_IP}:${VERT_PORT}/" convert.utilibre.org
check_http omnitools "http://${APP_BIND_IP}:${OMNITOOLS_PORT}/" tools.utilibre.org
check_http healthchecks "http://${APP_BIND_IP}:${HEALTHCHECKS_PORT}/api/v3/status/" monitor.utilibre.org
check_http pairdrop "http://${APP_BIND_IP}:${PAIRDROP_PORT}/" send.utilibre.org
check_http freshrss "http://${APP_BIND_IP}:${FRESHRSS_PORT}/i/" rss.utilibre.org
check_http rsshub "http://${APP_BIND_IP}:${RSSHUB_PORT}/healthz" feeds.utilibre.org
check_http privatebin "http://${APP_BIND_IP}:${PRIVATEBIN_PORT}/" paste.utilibre.org
check_http wakapi "http://${APP_BIND_IP}:${WAKAPI_PORT}/api/health" wakapi.utilibre.org

if ! docker compose exec -T postgres psql -U postgres -Atqc \
  "SELECT datname FROM pg_database WHERE datname IN ('healthchecks','freshrss','wakapi','crabfit') ORDER BY datname" \
  | grep -q healthchecks; then
  echo "postgres databases FAIL"
  failed=1
else
  echo "postgres databases OK"
fi

if [ "$(docker compose exec -T valkey valkey-cli ping 2>/dev/null || true)" != PONG ]; then
  echo "valkey FAIL"
  failed=1
else
  echo "valkey OK"
fi

wakapi_health=$(curl -sS --max-time 8 "http://${APP_BIND_IP}:${WAKAPI_PORT}/api/health" 2>/dev/null || true)
if ! printf '%s\n' "$wakapi_health" | grep -Eq '(^db=1$|"db"[[:space:]]*:[[:space:]]*(1|true))'; then
  echo "wakapi database health FAIL"
  failed=1
else
  echo "wakapi database health OK"
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

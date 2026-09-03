#!/bin/sh
set -eu

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir"
set -a
# shellcheck disable=SC1091
. ./.env
set +a

printf '%-14s %-10s %-10s %-8s %-5s %-9s %-8s %s\n' SERVICE STATE HEALTH PORT HTTP MEMORY RESTARTS PUBLIC_URL

row() {
  service=$1
  port=$2
  path=$3
  public_url=$4
  cid=$(docker compose ps -q "$service" 2>/dev/null || true)
  if [ -z "$cid" ]; then
    printf '%-14s %-10s %-10s %-8s %-5s %-9s %-8s %s\n' "$service" missing - "$port" 000 - - "$public_url"
    return
  fi
  state=$(docker inspect -f '{{.State.Status}}' "$cid")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")
  restarts=$(docker inspect -f '{{.RestartCount}}' "$cid")
  memory=$(docker stats --no-stream --format '{{.MemUsage}}' "$cid" | awk '{print $1}')
  host=${public_url#https://}
  code=$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 2 --max-time 8 \
    -H "Host: $host" -H 'X-Forwarded-Proto: https' \
    "http://${APP_BIND_IP}:${port}${path}" 2>/dev/null || true)
  printf '%-14s %-10s %-10s %-8s %-5s %-9s %-8s %s\n' "$service" "$state" "$health" "$port" "${code:-000}" "$memory" "$restarts" "$public_url"
}

internal_row() {
  service=$1
  cid=$(docker compose ps -q "$service" 2>/dev/null || true)
  [ -n "$cid" ] || return
  state=$(docker inspect -f '{{.State.Status}}' "$cid")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")
  restarts=$(docker inspect -f '{{.RestartCount}}' "$cid")
  memory=$(docker stats --no-stream --format '{{.MemUsage}}' "$cid" | awk '{print $1}')
  printf '%-14s %-10s %-10s %-8s %-5s %-9s %-8s %s\n' "$service" "$state" "$health" internal - "$memory" "$restarts" -
}

internal_row postgres
internal_row valkey
row ntfy "$NTFY_PORT" /v1/health https://notify.utilibre.org
row bentopdf "$BENTOPDF_PORT" / https://pdf.utilibre.org
row vert "$VERT_PORT" / https://convert.utilibre.org
row omnitools "$OMNITOOLS_PORT" / https://tools.utilibre.org
row healthchecks "$HEALTHCHECKS_PORT" /api/v3/status/ https://monitor.utilibre.org
row pairdrop "$PAIRDROP_PORT" / https://send.utilibre.org
row freshrss "$FRESHRSS_PORT" /i/ https://rss.utilibre.org
row rsshub "$RSSHUB_PORT" /healthz https://feeds.utilibre.org
row privatebin "$PRIVATEBIN_PORT" / https://paste.utilibre.org
row wakapi "$WAKAPI_PORT" /api/health https://wakapi.utilibre.org

echo
docker compose images
echo
echo "Full immutable references are in SOURCE_MANIFEST.md and compose.yaml."

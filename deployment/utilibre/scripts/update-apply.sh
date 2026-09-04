#!/bin/sh
set -eu

usage() {
  echo "Usage: $0 SERVICE FULL_IMAGE_REFERENCE_WITH_SHA256" >&2
  exit 2
}

[ "$#" -eq 2 ] || usage
service=$1
new_image=$2
case "$service" in
  freshrss|privatebin|valkey) ;;
  rsshub) echo "RSSHub updates require a review of its internal integration with FreshRSS." >&2; exit 1 ;;
  postgres) echo "PostgreSQL updates require the documented database-major review." >&2; exit 1 ;;
  *) usage ;;
esac
if ! printf '%s\n' "$new_image" | grep -Eq '@sha256:[0-9a-f]{64}$'; then
  echo "Image must end with a complete immutable @sha256 digest" >&2
  exit 1
fi
case "$service:$new_image" in
  freshrss:docker.io/freshrss/freshrss:*@sha256:*|\
  privatebin:docker.io/privatebin/nginx-fpm-alpine:*@sha256:*|\
  valkey:docker.io/valkey/valkey:*@sha256:*) ;;
  *) echo "Image repository does not match the selected official upstream service" >&2; exit 1 ;;
esac

root_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root_dir"
timestamp=$(date -u +%Y%m%d-%H%M%S)
backup_copy="$root_dir/data/backups/compose-before-${service}-${timestamp}.yaml"
cp compose.yaml "$backup_copy"
chmod 0600 "$backup_copy"
"$root_dir/scripts/backup.sh" >/dev/null
docker pull "$new_image"

python3 - "$service" "$new_image" <<'PY'
from pathlib import Path
import re, sys
service, image = sys.argv[1:]
path = Path('compose.yaml')
lines = path.read_text().splitlines()
inside = False
changed = False
for i, line in enumerate(lines):
    if re.match(rf'^  {re.escape(service)}:$', line):
        inside = True
        continue
    if inside and re.match(r'^  [a-zA-Z0-9_-]+:$', line):
        break
    if inside and re.match(r'^    image:', line):
        lines[i] = f'    image: {image}'
        changed = True
        break
if not changed:
    raise SystemExit(f'image line for {service} not found')
path.write_text('\n'.join(lines) + '\n')
PY

if ! docker compose config --quiet; then
  cp "$backup_copy" compose.yaml
  exit 1
fi
docker compose up -d --no-deps "$service"
attempt=0
health=starting
while [ "$attempt" -lt 30 ]; do
  cid=$(docker compose ps -q "$service")
  health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")
  [ "$health" = healthy ] || [ "$health" = running ] && break
  [ "$health" = unhealthy ] || [ "$health" = exited ] || [ "$health" = dead ] && break
  attempt=$((attempt + 1))
  sleep 5
done
if [ "$health" != healthy ] && [ "$health" != running ]; then
  cp "$backup_copy" compose.yaml
  docker compose up -d --no-deps "$service"
  echo "Update failed health validation and was rolled back" >&2
  exit 1
fi
echo "Updated $service; retained rollback file $backup_copy"

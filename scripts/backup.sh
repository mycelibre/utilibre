#!/bin/sh
set -eu

timestamp=$(date -u +%Y%m%dT%H%M%S.%NZ)
destination=${1:-./backups}
mkdir -p "${destination}"
archive="${destination}/public-utility-config-${timestamp}.tar.gz"

if [ -e "${archive}" ]; then
  echo "Backup target already exists; refusing to overwrite it: ${archive}" >&2
  exit 1
fi

tar -czf "${archive}" \
  --exclude='.env' \
  --exclude='runtime' \
  --exclude='config/searxng/limiter.toml' \
  --exclude='portal/node_modules' \
  --exclude='portal/dist' \
  --exclude='portal/test-results' \
  --exclude='portal/playwright-report' \
  --exclude='portal/public/vendor' \
  compose.yaml .env.example .gitignore config docs portal scripts secrets/README.md README.md LICENSE THIRD_PARTY_NOTICES.md

echo "Created configuration/source backup: ${archive}"
echo "Back up .env and secrets separately into an encrypted operator-controlled store."
echo "SearXNG cache and Valkey limiter state are intentionally excluded and can be recreated."

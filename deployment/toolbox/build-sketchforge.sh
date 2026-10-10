#!/bin/sh
set -eu
recipe_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
source_dir=${1:-/opt/utilibre/src/sketchforge}
[ "$(git -C "$source_dir" rev-parse HEAD)" = e9cb8e8681f92e12f6044e046046cf1d363f6811 ]
cd "$source_dir"
npm ci --ignore-scripts --no-fund
npm run copy:occt
# Upstream static mode hides server features. Exclude server-only route modules
# from static compilation and restore the exact source even when build fails.
[ ! -e apps/web/api-build-excluded ]
mv apps/web/src/app/api apps/web/api-build-excluded
trap 'mv apps/web/api-build-excluded apps/web/src/app/api' EXIT HUP INT TERM
STATIC_EXPORT=true NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SOURCE_CODE_URL=https://tools.utilibre.org/utilibre-source/sketchforge-utilibre.tar.gz NODE_OPTIONS=--max-old-space-size=3072 npm run build
mkdir -p apps/web/.next-export/licenses
cp "$recipe_dir"/sketchforge-notices/* apps/web/.next-export/licenses/
cp LICENSE apps/web/.next-export/LICENSE

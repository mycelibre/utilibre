#!/bin/sh
# Complete upstream build; downloading and networkless compilation are separate.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source_dir=${TEXLYRE_SOURCE_DIR:?Set TEXLYRE_SOURCE_DIR to a disposable pinned checkout}
mode=${1:---build}
case "$mode" in --dependencies|--build) ;; *) exit 2 ;; esac
revision=$(node -p "require('$repo/deployment/texlyre/inputs.json').revision")
compiler=$(node -p "require('$repo/deployment/texlyre/inputs.json').compiler")
test "$(git -C "$source_dir" rev-parse HEAD)" = "$revision"
node "$repo/deployment/texlyre/prepare.mjs" "$source_dir"
cp "$repo/deployment/texlyre/package-lock.json" "$source_dir/package-lock.json"
if [ "$mode" = --dependencies ]; then
  docker run --rm --read-only --cap-drop ALL --security-opt no-new-privileges \
    --memory 2g --cpus 2 --pids-limit 128 --ulimit core=0 \
    --tmpfs /tmp:rw,size=512m -v "$source_dir:/app" -w /app \
    -e npm_config_cache=/tmp/npm -e npm_config_update_notifier=false \
    "$compiler" npm ci --ignore-scripts --no-audit --no-fund
  exit 0
fi
(cd "$source_dir" && sha256sum -c "$repo/deployment/texlyre/assets.sha256")
docker run --rm --network none --read-only --cap-drop ALL \
  --security-opt no-new-privileges --memory 5g --cpus 2 --pids-limit 256 \
  --ulimit core=0 --tmpfs /tmp:rw,size=256m -v "$source_dir:/app" -w /app \
  -e NODE_OPTIONS=--max-old-space-size=3072 "$compiler" sh -ec '
    npm run generate:configs
    ./node_modules/.bin/tsx scripts/update-sw-version.js
    npm run build
  '
# Run the native/browser and recorded-advisory gates before a separate release.

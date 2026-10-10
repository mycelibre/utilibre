#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/kokoro-web}
phonemizer_dir=${2:-/opt/utilibre/build/kokoro-espeak/output}
integration_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
python3 "$integration_dir/prepare.py" "$source_dir"
cd "$source_dir"
# Use a task-owned disposable npm cache rather than pruning any shared cache.
npm ci --ignore-scripts --no-fund --cache "${KOKORO_NPM_CACHE:-/opt/utilibre/build/kokoro-npm-cache}"
python3 "$integration_dir/assets.py" "$source_dir" "$phonemizer_dir"
npm run check
NODE_OPTIONS=--max-old-space-size=1536 npm run build:static
# The static UI has no API. Do not serve generated API documentation/routes.
rm -rf build/api

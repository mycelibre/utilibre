#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/chitchatter}
[ "$(git -C "$source_dir" rev-parse HEAD)" = 23b62a8d95be003e490e5a050335e1dea4b79cc7 ]
cd "$source_dir"
npm ci --ignore-scripts --no-fund
VITE_HOMEPAGE=https://chat.utilibre.org/ VITE_ROUTER_TYPE=hash VITE_RTC_CONFIG_ENDPOINT= VITE_TRACKER_URL= NODE_OPTIONS=--max-old-space-size=3072 npx vite build
mkdir -p dist/streamsaver
cp node_modules/streamsaver/mitm.html node_modules/streamsaver/sw.js dist/streamsaver/
cp node_modules/streamsaver/LICENSE dist/streamsaver/LICENSE
cp LICENSE dist/LICENSE

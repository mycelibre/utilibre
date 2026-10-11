#!/bin/sh
# Full native application, pinned dependencies and locally served runtime assets.
set -eu
repo=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source_dir=${TEXLYRE_SOURCE_DIR:-/opt/utilibre/evaluation-src/texlyre-20261011}
revision=0b5ebfd3dbcd2d3647dc777e8de9cbe0692b7950
if [ ! -d "$source_dir/.git" ]; then
  git clone https://github.com/TeXlyre/texlyre "$source_dir"
  git -C "$source_dir" checkout --detach "$revision"
fi
node "$repo/deployment/texlyre/prepare.mjs" "$source_dir"
cp "$repo/deployment/texlyre/package-lock.json" "$source_dir/package-lock.json"
cd "$source_dir"
npm ci --ignore-scripts --no-audit --no-fund
npm audit --omit=dev
npm run generate:configs
npx --no-install tsx scripts/update-sw-version.js
npm run build
sha256sum -c "$repo/deployment/texlyre/assets.sha256"
# Publication is deliberately separate: inspect the build/tests before copying
# dist to /opt/utilibre/toolbox-public/apps/texlyre and updating the source offer.

#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/gravity}
integration_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 28e912b8f6808a4bf892fa0f1ffacf857b0faa3a ]
cd "$source_dir"
if git apply --check --unidiff-zero "$integration_dir/local-source.patch" 2>/dev/null; then
  git apply --unidiff-zero "$integration_dir/local-source.patch"
else
  git apply --reverse --check --unidiff-zero "$integration_dir/local-source.patch"
fi
# Promo-video ffmpeg hooks are unnecessary for the static app.
npm ci --ignore-scripts --no-fund
NODE_OPTIONS=--max-old-space-size=768 npm run build
# Only this build's unused third-party media is omitted; original source stays intact.
rm -rf dist/audio
rm -f dist/Moon-TomBrown.webp dist/earth_daymap.jpg
mkdir -p dist/licenses
cp LICENSE dist/licenses/gravity-GPL.txt
cp node_modules/three/LICENSE dist/licenses/three-MIT.txt
cp node_modules/@fontsource-variable/inter/LICENSE dist/licenses/inter-OFL.txt
cp node_modules/@fontsource-variable/roboto-mono/LICENSE dist/licenses/roboto-mono-OFL.txt

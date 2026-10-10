#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/moodist}
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
[ "$(git -C "$source_dir" rev-parse HEAD)" = 11c0be2200116a3635880d600fd6953899cc51a3 ]
cd "$source_dir"
npx --yes pnpm@10.30.3 install --frozen-lockfile --ignore-scripts
# Never publish unmapped upstream recordings. Preserve them outside the build
# while generating our own source-reproducible noise/timer assets.
backup_dir=$(mktemp -d /tmp/utilibre-moodist-audio.XXXXXX)
if [ -d public/sounds ]; then mv public/sounds "$backup_dir/sounds"; fi
trap 'if [ -d "$backup_dir/sounds" ]; then mv public/sounds "$backup_dir/generated"; mv "$backup_dir/sounds" public/sounds; fi' EXIT HUP INT TERM
python3 "$script_dir/generate-moodist-audio.py" public/sounds
node "$script_dir/install-moodist-recordings.mjs" public/sounds
NODE_OPTIONS=--max-old-space-size=2048 npx --yes pnpm@10.30.3 run build
cp LICENSE dist/LICENSE.txt

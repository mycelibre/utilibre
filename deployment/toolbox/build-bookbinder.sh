#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/bookbinder-js}
[ "$(git -C "$source_dir" rev-parse HEAD)" = 7df532dc29f6bbf4204d62796f4ff537594f5097 ]
cd "$source_dir"
npm ci --ignore-scripts --no-fund
cp node_modules/balloon-css/balloon.min.css public/balloon.min.css
cp node_modules/balloon-css/LICENSE public/balloon-LICENSE.txt
BASE=./ NODE_OPTIONS=--max-old-space-size=2048 npm run build
cp LICENSE dist/LICENSE.txt

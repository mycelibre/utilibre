#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/url-parameter-cleaner}
[ "$(git -C "$source_dir" rev-parse HEAD)" = 3b114cc94f728f0a6a3bed1e30fb63345abe5df4 ]
cd "$source_dir"
npm run check
npm test
npm run build
cp LICENSE dist/site/LICENSE

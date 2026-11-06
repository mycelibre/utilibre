#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/url-parameter-cleaner}
revision=$(git -C "$source_dir" rev-parse HEAD)
case "$revision" in
  3b114cc94f728f0a6a3bed1e30fb63345abe5df4) ;;
  e3bf8286e1d6dada00099eef2c392df2088e743a) ;;
  *) echo 'Unreviewed Link Cleaner revision' >&2; exit 1 ;;
esac
cd "$source_dir"
npm run check
npm test
npm run build
# The hosted app uses upstream modules, not its downloadable single-file bundle.
# Preserve the existing script-src/style-src self policy without inline grants.
cp index.html dist/site/index.html
cp LICENSE dist/site/LICENSE

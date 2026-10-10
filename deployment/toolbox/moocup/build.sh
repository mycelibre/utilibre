#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/moocup}
integration_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
revision=70623d81ba502a464fdd2b98c6c21b1c5ab973bc
[ "$(git -C "$source_dir" rev-parse HEAD)" = "$revision" ]
cd "$source_dir"
if git apply --check --unidiff-zero "$integration_dir/local-source.patch" 2>/dev/null; then
  git apply --unidiff-zero "$integration_dir/local-source.patch"
else
  git apply --reverse --check --unidiff-zero "$integration_dir/local-source.patch"
fi
npm exec --yes --package=pnpm@10.20.0 -- pnpm install --frozen-lockfile
npm exec --yes --package=pnpm@10.20.0 -- pnpm check
NODE_OPTIONS=--max-old-space-size=1536 npm exec --yes --package=pnpm@10.20.0 -- pnpm build
mkdir -p build/licenses
cp LICENSE build/licenses/moocup-LICENSE.txt
cp node_modules/@fontsource-variable/recursive/LICENSE build/licenses/recursive-OFL.txt
cp node_modules/html2canvas/LICENSE build/licenses/html2canvas-LICENSE.txt
# Publish only after native check.mjs succeeds against this private build.

#!/bin/sh
set -eu
# The exact upstream checkout must already have drawdb-local-source.patch applied.
# No server or user data is read by this build.
source_dir=${1:-/opt/utilibre/src/drawdb}
[ "$(git -C "$source_dir" rev-parse HEAD)" = e4e696f2d2b1a17ac99ad1d062927582ff994a3c ]
cd "$source_dir"
npm ci --ignore-scripts --no-fund
NODE_OPTIONS=--max-old-space-size=3072 npm run build
mkdir -p dist/licenses
cp LICENSE dist/licenses/drawDB-LICENSE.txt
cp node_modules/bootstrap-icons/LICENSE dist/licenses/bootstrap-icons-LICENSE.txt
cp node_modules/@fortawesome/fontawesome-free/LICENSE.txt dist/licenses/fontawesome-LICENSE.txt
cp node_modules/monaco-editor/LICENSE dist/licenses/monaco-LICENSE.txt
cp node_modules/dompurify/LICENSE dist/licenses/dompurify-LICENSE.txt

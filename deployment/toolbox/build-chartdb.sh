#!/bin/sh
set -eu
source_dir=${1:-/opt/utilibre/src/chartdb}
[ "$(git -C "$source_dir" rev-parse HEAD)" = c24936a402bb3e24b4858f05282d69a04fcfe25b ]
cd "$source_dir"
npm ci --ignore-scripts --no-fund
VITE_OPENAI_API_KEY= VITE_OPENAI_API_ENDPOINT= VITE_LLM_MODEL_NAME= VITE_DISABLE_ANALYTICS=true VITE_HIDE_CHARTDB_CLOUD=true VITE_HOST_URL=https://tools.utilibre.org/apps/chartdb VITE_APP_URL=https://tools.utilibre.org/apps/chartdb/ NODE_OPTIONS=--max-old-space-size=6144 npm run build
mkdir -p dist/licenses
cp LICENSE dist/licenses/chartdb-LICENSE.txt
cp node_modules/@fontsource/raleway/LICENSE dist/licenses/raleway-LICENSE.txt
cp node_modules/monaco-editor/LICENSE dist/licenses/monaco-LICENSE.txt
cp node_modules/dompurify/LICENSE dist/licenses/dompurify-LICENSE.txt

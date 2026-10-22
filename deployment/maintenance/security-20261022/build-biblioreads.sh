#!/bin/sh
# Isolated full build; no deployed directory or user data is writable.
set -eu
export npm_config_cache=/work/npm-cache NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=2048
mkdir /work/app /work/output
tar -C /source --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.dependencies.next="15.5.28";p.dependencies.dompurify="3.4.17";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "${RESOLVE_LOCK:-0}" = 1 ]; then
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  cp package.json package-lock.json /output/
  exit 0
fi
cp /lock/package-lock.json package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
node tests/utilibre.cjs
npm run build
cp -a .next/standalone/. /work/output/
mkdir -p /work/output/.next
cp -a .next/static /work/output/.next/
cp -a public /work/output/
cp utilibre-preload.cjs /work/output/
tar -C /work/output -czf /output/app.tar.gz .

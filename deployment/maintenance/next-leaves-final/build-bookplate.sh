#!/bin/sh
# All dependency/cache/build writes are confined to the caller's bounded /work tmpfs.
set -eu
export HOME=/work npm_config_cache=/work/npm-cache NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=2048
mkdir -p /work/app /work/output
cd /source
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.dependencies.next="16.3.8";p.devDependencies["eslint-config-next"]="16.3.8";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n");'
if [ "${RESOLVE_LOCK:-0}" = 1 ]; then
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  cp package-lock.json /output/package-lock.json
  exit 0
fi
cp /lock/package-lock.json package-lock.json
npm ci --no-audit --no-fund
npm run test
npm run build
cp -a .next/standalone/. /work/output/
mkdir -p /work/output/.next /work/output/scripts
cp -a .next/static /work/output/.next/static
cp -a public drizzle /work/output/
cp scripts/reset-password.mjs scripts/remove-showcase.mjs /work/output/scripts/
tar -C /work/output -czf /output/app.tar.gz .
sha256sum /output/app.tar.gz

#!/bin/sh
# Finite full client builds, with no production data, secrets, or Docker socket.
set -eu
export npm_config_cache=/work/npm-cache ASTRO_TELEMETRY_DISABLED=1
if [ "${MAINTENANCE_NOV4:-0}" = 1 ]; then
  export npm_config_cache=/cache npm_config_registry=https://registry.npmjs.org
  export npm_config_fetch_retries=1 npm_config_fetch_timeout=20000
fi
export NODE_OPTIONS=--max-old-space-size=2048
mkdir /work/app
tar -C /source --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.dependencies.dompurify="3.4.17";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "${MAINTENANCE_NOV4:-0}" = 1 ]; then
  test "$APPLICATION" = markmap
  node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.overrides={...p.overrides,"markdown-it":"14.3.3",undici:"6.29.1"};fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
fi
if [ "$RESOLVE_LOCK" = 1 ]; then
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  if [ "${MAINTENANCE_NOV4:-0}" = 1 ]; then
    # Download/integrity-check packages now; do not execute dependency scripts.
    npm ci --ignore-scripts --no-audit --no-fund
  fi
  cp package.json package-lock.json /output/
  exit 0
fi
cp /lock/package-lock.json package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
case "$APPLICATION" in
  candlr) npm test ;;
  markmap) mkdir -p public; cp /branding/svg/utilibre-logo-coral.svg public/; cp /branding/README.txt public/BRAND-NOTICE.txt ;;
  *) exit 2 ;;
esac
npm run build
tar -czf /output/dist.tar.gz dist
tar -czf /output/dompurify.tar.gz node_modules/dompurify

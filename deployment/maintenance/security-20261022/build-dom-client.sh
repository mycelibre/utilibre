#!/bin/sh
# Finite full client builds, with no production data, secrets, or Docker socket.
set -eu
export npm_config_cache=/work/npm-cache ASTRO_TELEMETRY_DISABLED=1
export NODE_OPTIONS=--max-old-space-size=2048
mkdir /work/app
tar -C /source --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("package.json"));p.dependencies.dompurify="3.4.17";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "$RESOLVE_LOCK" = 1 ]; then
  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
  cp package.json package-lock.json /output/
  exit 0
fi
cp /lock/package-lock.json package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
case "$APPLICATION" in
  candlr) npm test ;;
  markmap) cp /branding/svg/utilibre-logo-coral.svg public/; cp /branding/README.txt public/BRAND-NOTICE.txt ;;
  *) exit 2 ;;
esac
npm run build
tar -czf /output/dist.tar.gz dist
tar -czf /output/dompurify.tar.gz node_modules/dompurify

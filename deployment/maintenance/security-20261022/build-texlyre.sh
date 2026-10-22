#!/bin/sh
set -eu
export npm_config_cache=/work/npm-cache npm_config_update_notifier=false
export NODE_OPTIONS=--max-old-space-size=2048
mkdir /work/app
tar -C /source --exclude=.git --exclude=node_modules --exclude=dist --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),assert=require("assert/strict"),p=JSON.parse(fs.readFileSync("package.json"));assert.equal(p.overrides.dompurify,"3.4.16");p.overrides.dompurify="3.4.17";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "$RESOLVE_LOCK" = 1 ]; then
 npm install --package-lock-only --ignore-scripts --no-audit --no-fund
 cp package.json package-lock.json /output/
 exit 0
fi
cp /lock/package-lock.json package-lock.json
npm ci --ignore-scripts --no-audit --no-fund
./node_modules/.bin/jest tests/unit/utils/svgSanitizer.test.ts --runInBand
npm run generate:configs
./node_modules/.bin/tsx scripts/update-sw-version.js
npm run build
sha256sum -c /integration/assets.sha256
# Native test reuses PDF.js from this pinned dependency tree.
cp -a node_modules/pdfjs-dist /output/pdfjs-dist
tar -C dist -czf /output/dist.tar.gz .

#!/bin/sh
set -eu
export YARN_CACHE_FOLDER=/work/yarn-cache YARN_DISABLE_SELF_UPDATE_CHECK=1 GRIST_SKIP_EXT_AUTOSETUP=1
export NODE_OPTIONS=--max-old-space-size=2048
mkdir /work/app
tar -C /source --exclude=.git --exclude=node_modules --exclude=_build --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
node -e 'const fs=require("fs"),assert=require("assert/strict"),p=JSON.parse(fs.readFileSync("package.json"));assert.equal(p.dependencies.dompurify,"3.4.13");p.dependencies.dompurify="3.4.17";p.resolutions={...p.resolutions,dompurify:"3.4.17"};fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "$RESOLVE_LOCK" = 1 ]; then
 yarn install --mode=skip-build --ignore-scripts --ignore-platform --production=false --non-interactive --network-timeout 60000
 cp package.json yarn.lock /output/
 exit 0
fi
cp /lock/yarn.lock yarn.lock
yarn install --frozen-lockfile --ignore-scripts --production=false --non-interactive --network-timeout 60000
export GRIST_BUILD_CHANNEL=release GRIST_BUILD_COMMIT=6dfae2f
yarn run build:prod
# Do not replace backend output, sandbox binaries, native addons or migrations.
tar -czf /output/client.tar.gz static node_modules/dompurify

#!/bin/sh
set -eu
export BUN_INSTALL_CACHE_DIR=/work/bun-cache DO_NOT_TRACK=1
mkdir /work/app
tar -C /source -cf - . | tar -C /work/app -xf -
cd /work/app
bun -e 'const p=await Bun.file("package.json").json();if(p.dependencies.dompurify!=="3.4.16")throw Error("Dependency drift");p.dependencies.dompurify="3.4.17";await Bun.write("package.json",JSON.stringify(p,null,2)+"\n")'
if [ "$RESOLVE_LOCK" = 1 ]; then
 bun install --lockfile-only --ignore-scripts
 cp package.json bun.lock /output/
 exit 0
fi
cp /lock/bun.lock bun.lock
bun install --frozen-lockfile --ignore-scripts
LOG_LEVEL=error bun run build.ts
# Only these existing entry points and their exact sanitizer are deployed.
tar -czf /output/client.tar.gz src/public/app.js src/public/settings-page.js node_modules/dompurify

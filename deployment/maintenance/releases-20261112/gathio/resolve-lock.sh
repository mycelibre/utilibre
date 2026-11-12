#!/bin/sh
# Runs only inside the disposable resolver; no lifecycle scripts or app start.
set -eu
export HOME=/work npm_config_cache=/work/npm-cache XDG_CACHE_HOME=/work/cache XDG_DATA_HOME=/work/data PNPM_HOME=/work/pnpm
mkdir /work/app
cd /work/app
cp /input/package.json /input/pnpm-lock.yaml /input/pnpm-workspace.yaml .
node -e 'const fs=require("fs"),a=require("assert/strict"),p=JSON.parse(fs.readFileSync("package.json"));a.equal(p.dependencies.mongoose,"^6.13.11");p.dependencies.mongoose="6.13.12";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
node /tool/bin/pnpm.cjs install --lockfile-only --ignore-scripts --registry=https://registry.npmjs.org --reporter=append-only
cp package.json pnpm-lock.yaml /output/

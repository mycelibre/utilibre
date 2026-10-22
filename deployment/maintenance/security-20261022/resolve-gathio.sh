#!/bin/sh
set -eu
export npm_config_cache=/work/npm-cache XDG_CACHE_HOME=/work/cache XDG_DATA_HOME=/work/data PNPM_HOME=/work/pnpm
mkdir /work/app
cd /work/app
cp /source/package.json /source/pnpm-lock.yaml /source/pnpm-workspace.yaml .
node -e 'const fs=require("fs"),assert=require("assert/strict"),p=JSON.parse(fs.readFileSync("package.json"));assert.equal(p.dependencies.dompurify,"^3.4.16");assert.equal(p.dependencies.toml,"^5.0.0");p.dependencies.dompurify="3.4.17";p.dependencies.toml="5.0.1";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
npm exec --yes --package=pnpm@10.30.3 -- pnpm install --lockfile-only --ignore-scripts
cp package.json pnpm-lock.yaml /output/

#!/bin/sh
# Rebuild the captured Rallly source with the fixed Effect release.
set -eu
export npm_config_cache=/work/npm-cache NEXT_TELEMETRY_DISABLED=1 CHECKPOINT_DISABLE=1
export TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 HUSKY=0
export npm_config_update_notifier=false XDG_CACHE_HOME=/work/cache XDG_DATA_HOME=/work/data PNPM_HOME=/work/pnpm
export NODE_OPTIONS=--max-old-space-size=2560

if [ "$PHASE" = prepare ]; then
  cd /work
  echo '8046b45f519985bbf99c7386d8ff3880cd082824cc90b6d92729d50f811c8461  /input/rallly-utilibre.tar.gz' | sha256sum -c - >/dev/null
  tar -xzf /input/rallly-utilibre.tar.gz
  cd rallly
  echo 'c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4  /input/inter-latin.woff2' | sha256sum -c - >/dev/null
  echo '262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a  /input/Inter-OFL.txt' | sha256sum -c - >/dev/null
  node - <<'NODE'
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const file='apps/web/src/app/[locale]/layout.tsx';
let text=fs.readFileSync(file,'utf8');
assert.equal(crypto.createHash('sha256').update(text).digest('hex'),'dbaf7e0ee856912bcde6bb73afda592507b4aa7d066438f0f4cdde78c28c24a7');
const changes=[['import { Inter } from "next/font/google";','import localFont from "next/font/local";'],
 ['const inter = Inter({\n  subsets: ["latin"],\n  display: "swap",\n});',
  'const inter = localFont({\n  src: "./inter-latin.woff2",\n  weight: "100 900",\n  display: "swap",\n});']];
for(const [before,after] of changes){assert.equal(text.split(before).length,2);text=text.replace(before,after);}
fs.writeFileSync(file,text);
NODE
  cp /input/inter-latin.woff2 'apps/web/src/app/[locale]/inter-latin.woff2'
  cp /input/Inter-OFL.txt utilibre-security/Inter-OFL.txt
  echo '299479b0fa7a02fcd572a5688905452574dc0d206920e4bf58a4abee79704870  package.json' | sha256sum -c - >/dev/null
  echo '468ace3b7e43202df5fff43920548077454c5fc6fdd00f1970c5d9f5658f7061  apps/web/package.json' | sha256sum -c - >/dev/null
  echo 'fbf96552f9ec06fd04889f252f26ecd3d1739736b57aaa498a130dc87e807579  pnpm-lock.yaml' | sha256sum -c - >/dev/null
  node - <<'NODE'
const fs=require('fs'), assert=require('assert/strict');
const p=JSON.parse(fs.readFileSync('package.json','utf8'));
assert.equal(p.packageManager.split('+')[0],'pnpm@10.28.0');
assert.deepEqual(p.pnpm.overrides,{'next@16.3.0':'16.4.1',mysql2:'3.23.1','deepmerge-ts':'8.0.2','fast-xml-parser':'5.11.2'});
p.pnpm.overrides.effect='3.22.1';
fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
NODE
  npm exec --yes --package=pnpm@10.28.0 -- pnpm install --lockfile-only --ignore-scripts
  npm exec --yes --package=pnpm@10.28.0 -- pnpm install --prod=false --frozen-lockfile --ignore-scripts
  SKIP_ENV_VALIDATION=1 npm exec --yes --package=pnpm@10.28.0 -- pnpm db:generate
  node - <<'NODE'
const fs=require('fs'),assert=require('assert/strict');
const lock=fs.readFileSync('pnpm-lock.yaml','utf8');
assert(lock.includes('effect@3.22.1:'));
assert(!lock.includes('effect@3.20.0'));
assert(lock.includes('effect: 3.22.1'));
NODE
  sha256sum package.json pnpm-lock.yaml 'apps/web/src/app/[locale]/layout.tsx' 'apps/web/src/app/[locale]/inter-latin.woff2' > /output/lock-hashes-v4.txt
  tar -C /work -czf /stage/prepared.tar.gz rallly npm-cache
  exit 0
fi

test "$PHASE" = build
tar -C /work -xzf /stage/prepared.tar.gz
cd /work/rallly
sha256sum -c /output/lock-hashes-v4.txt >/dev/null
export npm_config_offline=true
export NEXT_PUBLIC_APP_VERSION=4.15.4 NEXT_PUBLIC_SELF_HOSTED=true SKIP_ENV_VALIDATION=1
export API_BASE_URL=
npm exec --offline --package=pnpm@10.28.0 -- pnpm db:generate
NEXT_PUBLIC_SELF_HOSTED=false NODE_ENV=test NODE_OPTIONS='--max-old-space-size=2560 --dns-result-order=ipv4first' npm exec --offline --package=pnpm@10.28.0 -- pnpm --filter @rallly/web test:unit
export NODE_ENV=production CIRCLE_NODE_TOTAL=2
node - <<'NODE'
const fs=require('fs');const p=JSON.parse(fs.readFileSync('turbo.json','utf8'));
p.globalEnv=[...p.globalEnv,'CIRCLE_NODE_TOTAL'];
fs.writeFileSync('turbo.json',JSON.stringify(p,null,2)+'\n');
NODE
npm exec --offline --package=pnpm@10.28.0 -- pnpm build
mkdir -p /work/result/apps/web/.next
cp -a apps/web/.next/standalone/. /work/result/
cp -a apps/web/.next/static /work/result/apps/web/.next/
cp -a apps/web/public /work/result/apps/web/
tar -C /work/result -czf /output/app.tar.gz .
echo 'Rallly fixed-Effect offline build and native unit suite passed'

#!/bin/sh
# Complete upstream builds, separated from runtime migration tooling and data.
set -eu
export npm_config_cache=/work/npm-cache NEXT_TELEMETRY_DISABLED=1 CHECKPOINT_DISABLE=1
export TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 HUSKY=0
export npm_config_update_notifier=false
export NODE_OPTIONS=--max-old-space-size=2560
mkdir /work/app /work/output
tar -C /source --exclude=.git --exclude=node_modules --exclude=.next --exclude='.env*' -cf - . | tar -C /work/app -xf -
cd /work/app
case "$APPLICATION" in
 spliit)
  node /recipe/pin-next-app.cjs spliit
  if [ "$RESOLVE_LOCK" = 1 ]; then
   npm install --package-lock-only --ignore-scripts --no-audit --no-fund
   cp package.json package-lock.json /output/
   exit 0
  fi
  cp /lock/package-lock.json package-lock.json
  npm ci --include=dev --ignore-scripts --no-audit --no-fund
  # Preserve the already-deployed removal of third-party country-flag images.
  node -e 'const fs=require("fs"),assert=require("assert/strict");const p="src/components/currency-selector.tsx",text=fs.readFileSync(p,"utf8");const a="  const flagUrl = `https://flagcdn.com/h24/${\n    currency?.code.length ? currency.code.slice(0, 2).toLowerCase() : \u0027un\u0027\n  }.png`\n",b="      <img src={flagUrl} className=\"w-4\" alt=\"\" />\n";assert.equal(text.split(a).length,2);assert.equal(text.split(b).length,2);fs.writeFileSync(p,text.replace(a,"").replace(b,""))'
  ./node_modules/.bin/prisma generate
  cp scripts/build.env .env
  NODE_ENV=test npm test -- --runInBand
  export NODE_ENV=production
  npm run build
  cp -a .next/standalone/. /work/output/
  rm -f /work/output/.env
  mkdir -p /work/output/.next
  cp -a .next/static /work/output/.next/
  cp -a public /work/output/
  ;;
 rallly)
  node /recipe/pin-next-app.cjs rallly
  export XDG_CACHE_HOME=/work/cache XDG_DATA_HOME=/work/data PNPM_HOME=/work/pnpm
  if [ "$RESOLVE_LOCK" = 1 ]; then
   npm exec --yes --package=pnpm@10.28.0 -- pnpm install --lockfile-only --ignore-scripts
   cp package.json pnpm-lock.yaml /output/
   cp apps/web/package.json /output/web-package.json
   exit 0
  fi
  cp /lock/pnpm-lock.yaml pnpm-lock.yaml
  npm exec --yes --package=pnpm@10.28.0 -- pnpm install --prod=false --frozen-lockfile --ignore-scripts
  export NEXT_PUBLIC_APP_VERSION=4.15.4 NEXT_PUBLIC_SELF_HOSTED=true SKIP_ENV_VALIDATION=1
  export API_BASE_URL=
  npm exec --yes --package=pnpm@10.28.0 -- pnpm db:generate
  # Upstream unit fixtures assert cloud-tier restrictions. Test that intended
  # mode, then compile the actual self-hosted mode; native gates cover it.
  # Use one deterministic loopback family for the local proxy fixture.
  NEXT_PUBLIC_SELF_HOSTED=false NODE_ENV=test NODE_OPTIONS="--max-old-space-size=2560 --dns-result-order=ipv4first" npm exec --yes --package=pnpm@10.28.0 -- pnpm --filter @rallly/web test:unit
  # Next reads host CPU count, not the container quota. Its supported CI worker
  # hint bounds page generation to one worker; Turbo must pass it explicitly.
  export CIRCLE_NODE_TOTAL=2
  node -e 'const fs=require("fs"),p=JSON.parse(fs.readFileSync("turbo.json"));p.globalEnv=[...p.globalEnv,"CIRCLE_NODE_TOTAL"];fs.writeFileSync("turbo.json",JSON.stringify(p,null,2)+"\n")'
  npm exec --yes --package=pnpm@10.28.0 -- pnpm build
  cp -a apps/web/.next/standalone/. /work/output/
  mkdir -p /work/output/apps/web/.next
  cp -a apps/web/.next/static /work/output/apps/web/.next/
  cp -a apps/web/public /work/output/apps/web/
  ;;
 *) exit 2 ;;
esac
tar -C /work/output -czf /output/app.tar.gz .

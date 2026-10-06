FROM oven/bun:1.3.10@sha256:b86c67b531d87b4db11470d9b2bd0c519b1976eee6fcd71634e73abfa6230d2e AS build
WORKDIR /app
COPY . .
ENV PUB_ENV=production PUB_HOSTNAME=convert.utilibre.org PUB_PLAUSIBLE_URL="" PUB_VERTD_URL="" PUB_DISABLE_ALL_EXTERNAL_REQUESTS=true PUB_DONATION_URL="" PUB_STRIPE_KEY="" PUB_DISABLE_FAILURE_BLOCKS=false
RUN bun install --frozen-lockfile
# Serve the exact upstream FFmpeg core locally instead of contacting jsDelivr.
RUN bun -e 'const r=await fetch("https://registry.npmjs.org/@ffmpeg/core/-/core-0.12.10.tgz"); if(!r.ok)throw Error(r.status); await Bun.write("/tmp/ffmpeg.tgz",r)' && mkdir -p static/ffmpeg && tar -xzf /tmp/ffmpeg.tgz --strip-components=3 -C static/ffmpeg package/dist/esm
RUN sed -i 's|https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm|/ffmpeg|g' src/lib/converters/ffmpeg/ffmpeg.svelte.ts
# The upstream size-limit hook still probes remote servers in local-only mode.
# Avoid that probe and bypass problematic browser cache writes for the large
# Pandoc module. Both changes are included in the published build source.
RUN bun -e 'const p="src/lib/sections/settings/vertdSettings.svelte.ts"; let s=await Bun.file(p).text(); s="import { DISABLE_ALL_EXTERNAL_REQUESTS } from \"$lib/util/consts\";\n"+s; s=s.replace("export function useVertdSizeLimit() {", "export function useVertdSizeLimit() {\n\tif (DISABLE_ALL_EXTERNAL_REQUESTS) return;"); await Bun.write(p,s); const q="src/lib/converters/pandoc/pandoc.svelte.ts"; await Bun.write(q,(await Bun.file(q).text()).replace("fetch(\"/pandoc.wasm\")", "fetch(\"/pandoc.wasm\", { cache: \"no-store\" })"));'
COPY --from=integration patch-vert-copy.mjs /tmp/patch-vert-copy.mjs
RUN bun /tmp/patch-vert-copy.mjs && bun run build
FROM nginxinc/nginx-unprivileged:1.28-alpine@sha256:7377697a821c131a924a7105fafbe7414db4e9fcc77a6f08f776f33f141ec3f8
COPY --from=build /app/build /usr/share/nginx/html
ADD --chmod=644 https://raw.githubusercontent.com/VERT-sh/VERT/c7b9f3921d6f8722c1dc1515799b461622777068/LICENSE /usr/share/nginx/html/LICENSE.txt
ENTRYPOINT ["nginx", "-g", "daemon off;"]

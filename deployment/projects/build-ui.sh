#!/bin/sh
# Build the native React frontend from pinned source and two readable patches.
set -eu
root=/home/ubuntu/freetools
source=/opt/utilibre/src/planka-projects
out=/opt/utilibre/build-projects-native
pin=455aa274b44e63efa42840997ea4924b43eed533
test "$(git -C "$source" rev-parse HEAD)" = "$pin"
# Only these disposable build directories are replaced; runtime state is elsewhere.
rm -rf "$out/input" "$out/public" "$out/views"
mkdir -p "$out/input" "$out/public" "$out/views"
# Apply both readable patches to an exact source tree.
git -C "$source" archive "$pin" | tar -x -C "$out/input"
patch --batch --fuzz=0 -p1 -d "$out/input" -i "$root/deployment/evaluation/projects/security-dependencies.patch"
patch --batch --fuzz=0 -p1 -d "$out/input" -i "$root/deployment/projects/native-login.patch"
docker run --rm --name utilibre-projects-native-client-build --cpus=2 --memory=4g --pids-limit=256 \
  --tmpfs /work:rw,exec,nosuid,nodev,size=2g,mode=1777 \
  --mount type=bind,src="$out/input/client",dst=/source,readonly \
  --mount type=bind,src="$out/public",dst=/output \
  -e NODE_OPTIONS=--max-old-space-size=1536 -e CI=true \
  node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 \
  sh -ec 'cd /work; cp -a /source/. .; npm install --global npm@11.19.1 --no-audit --no-fund; npm ci --omit=dev --ignore-scripts --no-audit --no-fund --cache /work/npm-cache; npm run postinstall; DISABLE_ESLINT_PLUGIN=true npm run build; cp -a build/. /output/'
cp "$out/public/index.html" "$out/views/index.ejs"
cat > "$out/Dockerfile" <<'EOF'
FROM utilibre-projects-pilot:455aa274-p1
USER root
RUN rm -rf /app/public/static
COPY --chown=node:node public/ /app/public/
COPY --chown=node:node views/ /app/views/
USER node
EOF
printf 'input/\n' > "$out/.dockerignore"
DOCKER_BUILDKIT=0 docker build --network=none --cpu-period=100000 --cpu-quota=100000 --memory=512m -t utilibre-projects:455aa274-p2 "$out"

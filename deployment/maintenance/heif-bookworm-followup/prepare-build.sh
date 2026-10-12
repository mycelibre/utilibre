#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012
ASSESS=/var/lib/utilibre-maintenance/openldap-followup-20261012/next-assessment
RECIPES=/home/ubuntu/freetools/deployment/maintenance/heif-bookworm-followup
CONTAINER=maintenance-sudo-bookworm-build
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$TASK/sources" "$TASK/recipes" "$TASK/output"
cp "$ASSESS"/libheif/libheif_* "$TASK/sources/"
for commit in b8c12a7b70f46c9516711a988483bed377b78d46 22b6266bf03a9f016f84a9b57b80e1dd7c79d64a; do cp "$ASSESS/$commit.patch" "$ASSESS/$commit-path-only.patch" "$TASK/sources/"; done
cp "$RECIPES/build-inner.sh" "$RECIPES/native.cc" "$RECIPES/overlay.cc" "$TASK/recipes/"
node "$RECIPES/verify-source.mjs"
docker network connect bridge "$CONTAINER"
trap 'docker network disconnect bridge "$CONTAINER" || true' EXIT
docker exec "$CONTAINER" sh -ec 'export DEBIAN_FRONTEND=noninteractive; apt-get -qq update; apt-get -qqy --no-install-recommends install cmake quilt libaom-dev libdav1d-dev libde265-dev libgdk-pixbuf2.0-dev libjpeg-dev libpng-dev libx265-dev libheif-dev=1.15.1-1+deb12u1' > "$TASK/dependencies.log" 2>&1
docker network disconnect bridge "$CONTAINER"
trap - EXIT
docker exec "$CONTAINER" sh -ec 'test ! -e /work/heif-followup; mkdir -p /work/heif-followup/output'
docker cp "$TASK/sources" "$CONTAINER:/work/heif-followup/sources"
docker cp "$TASK/recipes" "$CONTAINER:/work/heif-followup/recipes"
docker exec "$CONTAINER" chown -R nobody:nogroup /work/heif-followup
docker exec -u nobody "$CONTAINER" sh /work/heif-followup/recipes/build-inner.sh
docker cp "$CONTAINER:/work/heif-followup/output/." "$TASK/output/"

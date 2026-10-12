#!/bin/sh
set -eu
umask 077
TASK=/var/lib/utilibre-maintenance/tiff-bookworm-followup-20261012
RECIPES=/home/ubuntu/freetools/deployment/maintenance/tiff-bookworm-followup
CONTAINER=maintenance-sudo-bookworm-build
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$TASK/recipes" "$TASK/output"
cp /var/lib/utilibre-maintenance/penpot-native-followup-20261012/tiff/sources/tiff_4.7.2* "$TASK/sources/"
cp "$RECIPES/build-inner.sh" "$TASK/recipes/"
cp /home/ubuntu/freetools/deployment/maintenance/penpot-native-followup/tiff-native.c "$TASK/recipes/"
node "$RECIPES/verify-source.mjs"
docker network connect bridge "$CONTAINER"
trap 'docker network disconnect bridge "$CONTAINER" || true' EXIT
docker exec "$CONTAINER" sh -ec 'export DEBIAN_FRONTEND=noninteractive; apt-get -qq update; apt-get -qqy --no-install-recommends install build-essential debhelper-compat autoconf automake libtool pkg-config freeglut3-dev libglu1-mesa-dev libjbig-dev libjpeg-dev liblzma-dev libzstd-dev libwebp-dev libxi-dev zlib1g-dev libdeflate-dev liblerc-dev python3-sphinx debian-keyring gpgv libtiff-dev=4.5.0-6+deb12u4' > "$TASK/dependencies.log" 2>&1
docker network disconnect bridge "$CONTAINER"
trap - EXIT
docker exec "$CONTAINER" sh -ec 'test ! -e /work/tiff-followup; mkdir -p /work/tiff-followup/output'
docker cp "$TASK/sources" "$CONTAINER:/work/tiff-followup/sources"
docker cp "$TASK/recipes" "$CONTAINER:/work/tiff-followup/recipes"
docker exec "$CONTAINER" chown -R nobody:nogroup /work/tiff-followup
docker exec -u nobody "$CONTAINER" sh /work/tiff-followup/recipes/build-inner.sh
docker cp "$CONTAINER:/work/tiff-followup/output/." "$TASK/output/"

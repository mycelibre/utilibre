#!/bin/sh
set -eu
TASK=/var/lib/utilibre-maintenance/mount-acl-final-20261012
PREVIOUS=/var/lib/utilibre-maintenance/closure-followup-20261012
BUILDER=maintenance-sudo-bookworm-build
RECIPE=/home/ubuntu/freetools/deployment/maintenance/mount-acl-final
test "$(df -B1 --output=avail / | tail -1)" -ge 10737418240
mkdir -p "$TASK/sources" "$TASK/output"
for name in util-linux_2.38.1-5+deb12u3.dsc util-linux_2.38.1-5+deb12u3.debian.tar.xz util-linux_2.38.1.orig.tar.xz; do
 cp -n "$PREVIOUS/sources/$name" "$TASK/sources/"
done
node "$RECIPE/verify-source.mjs"
docker exec "$BUILDER" mkdir -p /work/mount-acl-final/sources /work/mount-acl-final/recipes /work/mount-acl-final/output
docker cp "$TASK/sources/." "$BUILDER:/work/mount-acl-final/sources/"
docker cp "$RECIPE/." "$BUILDER:/work/mount-acl-final/recipes/"
docker exec "$BUILDER" sh -c 'cd /work/mount-acl-final; test ! -e source; dpkg-source --no-check -x sources/util-linux_2.38.1-5+deb12u3.dsc source'
docker network connect bridge "$BUILDER"
trap 'docker network disconnect bridge "$BUILDER" >/dev/null 2>&1 || true' EXIT
docker exec "$BUILDER" sh -c 'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq; cd /work/mount-acl-final/source; apt-get build-dep -y --no-install-recommends .; dpkg-query -W > /work/mount-acl-final/output/build-packages.lock' > "$TASK/output/prepare.log" 2>&1

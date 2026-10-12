#!/bin/sh
set -eu
RECIPE=/home/ubuntu/freetools/deployment/maintenance/mount-acl-final
BUILDER=maintenance-sudo-bookworm-build
test "$(df -B1 --output=avail / | tail -1)" -ge 8589934592
docker cp "$RECIPE/." "$BUILDER:/work/mount-acl-final/recipes/"
docker exec "$BUILDER" sh -c '
 set -eu
 cd /work/mount-acl-final/source
 test "$(dpkg-parsechangelog -SVersion)" = 2.38.1-5+deb12u3
 test ! -e debian/patches/utilibre-legacy-target-pinning.patch
 cp ../recipes/legacy-target-pinning.patch debian/patches/utilibre-legacy-target-pinning.patch
 printf "%s\n" utilibre-legacy-target-pinning.patch >> debian/patches/series
 QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS="--fuzz=0" quilt push -a
 '
docker exec "$BUILDER" sh /work/mount-acl-final/recipes/inner-build.sh

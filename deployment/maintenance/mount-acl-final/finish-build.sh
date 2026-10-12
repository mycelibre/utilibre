#!/bin/sh
set -eu
node /home/ubuntu/freetools/deployment/maintenance/mount-acl-final/finish-build.mjs
docker exec maintenance-sudo-bookworm-build sh -c '
 cd /work/mount-acl-final/source
 runuser -u nobody -- env DEB_BUILD_OPTIONS="parallel=2 nocheck" dpkg-buildpackage -b -us -uc -nc -j2 > ../output/package.log 2>&1
 '

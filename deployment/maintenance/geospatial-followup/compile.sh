#!/bin/sh
# Disposable native builder, 2 CPU / 4 GiB. No production filesystem mounted.
set -eu
test "$(dpkg --print-architecture)" = amd64
test -s /work/source/authenticated.json
cd /work/source-tree
export DEB_BUILD_OPTIONS=parallel=2
export MAKEFLAGS=-j2
export PG_UPDATECONTROL=yes
pg_buildext checkcontrol
test "$(pg_buildext supported-versions)" = 17
dpkg-source --before-build .
dpkg-checkbuilddeps
dpkg-source -b .
dpkg-buildpackage -B -us -uc
# dpkg-buildpackage un-applies quilt patches after building. Restore the exact
# reviewed source and regression files before collecting runtime test fixtures.
dpkg-source --before-build .
cp ../postgresql-17-postgis-3_3.6.0+dfsg-3.pgdg12+1+utilibre1_amd64.deb /work/out/
cp ../postgis_3.6.0+dfsg-3.pgdg12+1+utilibre1.debian.tar.xz ../postgis_3.6.0+dfsg-3.pgdg12+1+utilibre1.dsc /work/out/
cp /work/source/postgis_3.6.0+dfsg.orig.tar.xz /work/out/
cp ../postgis_3.6.0+dfsg-3.pgdg12+1+utilibre1_amd64.buildinfo /work/out/
cp regress/core/flatgeobuf.sql regress/core/flatgeobuf_expected /work/out/
cp debian/patches/CVE-2026-73515.patch /work/out/applied.patch
dpkg-query -W -f='${Package}\t${Version}\n' > /work/out/builder-packages.tsv
sha256sum /work/out/*.deb /work/out/*.dsc /work/out/*.tar.xz /work/out/applied.patch > /work/out/SHA256SUMS
printf '%s\n' COMPILED

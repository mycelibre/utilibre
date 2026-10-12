#!/bin/sh
# Run only after the HDF5 owner releases the shared isolated compiler.
set -eu
test "$(dpkg --print-architecture)" = amd64
test -f /work/gdal-tree/build-py3.11/libgdal.so.32.3.6.2
test -f /work/gdal-source/hdf-prerequisites.json
test "$(dpkg-query -W -f='${Status}' libcurl4-gnutls-dev)" = 'install ok installed'
export DEB_BUILD_OPTIONS=parallel=2 MAKEFLAGS=-j2
cd /work/gdal-tree
test "$(dpkg-parsechangelog -S Version)" = 3.6.2+dfsg-1+utilibre1
mkdir -p /work/gdal-avif/output /work/gdal-avif/predecessor
cp debian/changelog debian/patches/series frmts/heif/heifdataset.cpp /work/gdal-avif/predecessor/
find debian/patches -type f -exec sha256sum {} + | sort > /work/gdal-avif/output/prior-patches.sha256
cp /work/gdal-avif/154b1cbbfbbe0a0b19c5b64e99d2e9493db9a016.patch debian/patches/utilibre-avif-zero-read.patch
printf '%s\n' utilibre-avif-zero-read.patch >> debian/patches/series
QUILT_PATCHES=debian/patches quilt push -a --fuzz=0
{ printf 'gdal (3.6.2+dfsg-1+utilibre2) bookworm; urgency=medium\n\n  * Preserve all prior native security fixes and dependencies.\n  * Apply upstream 154b1cbb AVIF zero-byte reader fix without code adaptation.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 16:30:00 +0000\n\n'; cat debian/changelog; } > /work/gdal-avif/changelog
mv /work/gdal-avif/changelog debian/changelog
# Remove only generated package staging, preserving compiled object cache.
dh_clean
if [ -d swig/python/gdal-utils/GDAL.egg-info ]; then
 mv swig/python/gdal-utils/GDAL.egg-info /work/gdal-avif/generated-egg-info
fi
dpkg-checkbuilddeps
dpkg-source --before-build .
dpkg-source --extend-diff-ignore='(^|/)build-py3\.11(/|$)' -b .
dpkg-buildpackage -B -us -uc -nc
cp ../libgdal32_3.6.2+dfsg-1+utilibre2_amd64.deb ../gdal_3.6.2+dfsg-1+utilibre2.dsc ../gdal_3.6.2+dfsg-1+utilibre2.debian.tar.xz /work/gdal-avif/output/
cp /work/gdal-source/gdal_3.6.2+dfsg.orig.tar.xz /work/gdal-avif/output/
sha256sum /work/gdal-avif/output/*.deb /work/gdal-avif/output/*.dsc /work/gdal-avif/output/*.tar.xz > /work/gdal-avif/output/SHA256SUMS
printf '%s\n' GDAL_AVIF_COMPILED

#!/bin/sh
set -eu
test "$(dpkg --print-architecture)" = amd64
cd /work/gdal-tree
export DEB_BUILD_OPTIONS=parallel=2
export MAKEFLAGS=-j2
dpkg-checkbuilddeps
case "${1:-}" in
  '') debian/rules clean ;;
  --incremental-hdf)
    # Only the already-built, reviewed tree with the explicit upstream
    # prerequisite receipt may skip cleanup. Native tests still run.
    test -f /work/gdal-source/hdf-prerequisites.json
    test -f build-py3.11/libgdal.so.32.3.6.2
    # Clear Debian package staging, not the native object files. Otherwise the
    # source package correctly rejects generated staged binaries as additions.
    dh_clean
    ;;
  *) exit 2 ;;
esac
# Debian's clean target leaves generated Python packaging metadata behind.
# Preserve that build-only output outside the source rather than include it.
if [ -d swig/python/gdal-utils/GDAL.egg-info ]; then
  gdal_egginfo_archive="$(mktemp -d /work/gdal-generated-egginfo.XXXXXX)"
  mv swig/python/gdal-utils/GDAL.egg-info "$gdal_egginfo_archive/"
fi
dpkg-source --before-build .
if [ "${1:-}" = --incremental-hdf ]; then
  # The initial clean source already established this is a generated CMake
  # output directory. Do not distribute its compiled Python/native objects.
  dpkg-source --extend-diff-ignore='(^|/)build-py3\.11(/|$)' -b .
else
  dpkg-source -b .
fi
if [ "${1:-}" = --incremental-hdf ]; then
  dpkg-buildpackage -B -us -uc -nc
else
  dpkg-buildpackage -B -us -uc
fi
dpkg-source --before-build .
mkdir -p /work/gdal-out
cp ../libgdal32_3.6.2+dfsg-1+utilibre1_amd64.deb ../gdal_3.6.2+dfsg-1+utilibre1.dsc ../gdal_3.6.2+dfsg-1+utilibre1.debian.tar.xz ../gdal_3.6.2+dfsg-1+utilibre1_amd64.buildinfo /work/gdal-out/
cp /work/gdal-source/gdal_3.6.2+dfsg.orig.tar.xz /work/gdal-out/
cp debian/patches/CVE-2026-*.patch /work/gdal-out/
if [ -f /work/gdal-source/hdf-prerequisites.json ]; then
  cp debian/patches/utilibre-hdf-prerequisite-*.patch /work/gdal-out/
fi
dpkg-query -W -f='${Package}\t${Version}\n' > /work/gdal-out/builder-packages.tsv
sha256sum /work/gdal-out/*.deb /work/gdal-out/*.dsc /work/gdal-out/*.tar.xz /work/gdal-out/*.patch > /work/gdal-out/SHA256SUMS
printf '%s\n' GDAL_COMPILED

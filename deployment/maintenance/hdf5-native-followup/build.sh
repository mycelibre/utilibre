#!/bin/sh
set -eu
cd /work/hdf5-native-followup
if test ! -d tree; then dpkg-source -x source/hdf5_1.10.8+repack1-1.dsc tree; fi
test -e hdf5_1.10.8+repack1.orig.tar.gz || ln source/hdf5_1.10.8+repack1.orig.tar.gz hdf5_1.10.8+repack1.orig.tar.gz
cd tree
test "$(dpkg-parsechangelog -S Version)" = '1.10.8+repack1-1'
cp ../source/46cedc2eb03ad7cd6e8404f5e6b526588436f946-context-only.patch debian/patches/utilibre-CVE-2018-11205.patch
printf '%s\n' utilibre-CVE-2018-11205.patch >> debian/patches/series
QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS='--fuzz=0' quilt push -a
DEBFULLNAME='Utilibre maintenance' DEBEMAIL=admin@utilibre.org debchange --newversion '1.10.8+repack1-1+utilibre1' --distribution bookworm --force-distribution 'Backport upstream 46cedc2 bounds/error checks for CVE-2018-11205 with unchanged code hunks; preserve Debian patches and native serial ABI.'
# Supported vendor knobs disable uninstalled MPI flavours. Complete serial C,
# HL, C++, Fortran and JNI build/test stay enabled. -d skips only the original
# unconditional MPI build-dependency check; actual serial dependencies installed.
export OMPIARCHS= MPICHARCHS= LC_ALL=C.UTF-8 DEB_BUILD_OPTIONS=parallel=2
# Root's DAC override defeats upstream's real read-only-file test. Drop that
# privilege rather than modifying/skipping the test or production permissions.
setpriv --bounding-set=-dac_override,-dac_read_search dpkg-buildpackage -B -d -us -uc -j2
printf 'HDF5_DEBIAN_SERIAL_BUILD_PASSED\n'
sh ../recipe/source.sh

#!/bin/sh
# Only resume this exact build after diagnosing root-only permission behavior.
set -eu
cd /work/hdf5-native-followup/tree
test "$(dpkg-parsechangelog -S Version)" = '1.10.8+repack1-1+utilibre1'
export OMPIARCHS= MPICHARCHS= LC_ALL=C.UTF-8 DEB_BUILD_OPTIONS=parallel=2
# Existing successful upstream stamps are retained, not fabricated. The failing
# junit script has no completion stamp and is run again in full.
# This old vendor's configure helper creates symlinks non-idempotently. Resume
# by removing only its exact generated helper symlinks; no source/test stamps,
# binaries or production files are deleted. The ordinary full rules run again.
test -s debian/build-serial/config.status
test -s debian/build-serial/src/.libs/libhdf5_serial.so.103.3.1
test -f debian/build-serial/java/test/junit.sh.chkexe
for helper in libhdf5-flavor-hl-cpp-100.links libhdf5-flavor-hl-100.shlibs \
 libhdf5-flavor-cpp-103-1.install libhdf5-flavor-103-1.install \
 libhdf5-flavor-hl-cpp-100.install libhdf5-flavor-hl-fortran-100.install \
 libhdf5-flavor-103-1.shlibs libhdf5-flavor-hl-fortran-100.shlibs \
 libhdf5-flavor-fortran-102.install libhdf5-flavor-103-1.doc \
 libhdf5-flavor-hl-100.install libhdf5-flavor-cpp-103-1.links \
 libhdf5-flavor-fortran-102.shlibs; do
 test -L "debian/$helper"
 case "$(readlink "debian/$helper")" in libhdf5-flavor-*) ;; *) exit 1;; esac
 unlink "debian/$helper"
done
setpriv --bounding-set=-dac_override,-dac_read_search dpkg-buildpackage -B -nc -d -us -uc -j2
printf 'HDF5_DEBIAN_SERIAL_BUILD_PASSED\n'
sh ../recipe/source.sh

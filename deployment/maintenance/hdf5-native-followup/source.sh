#!/bin/sh
set -eu
cd /work/hdf5-native-followup
test ! -d source-export
dpkg-source -x source/hdf5_1.10.8+repack1-1.dsc source-export
cp tree/debian/changelog source-export/debian/changelog
cp tree/debian/patches/utilibre-CVE-2018-11205.patch source-export/debian/patches/
printf '%s\n' utilibre-CVE-2018-11205.patch >> source-export/debian/patches/series
cd source-export
QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS='--fuzz=0' quilt push -a
cmp src/H5Dbtree.c ../tree/src/H5Dbtree.c
cmp src/H5Dchunk.c ../tree/src/H5Dchunk.c
dpkg-source -b .
printf 'HDF5_CORRESPONDING_SOURCE_PASSED\n'

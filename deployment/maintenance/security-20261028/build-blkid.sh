#!/bin/sh
# Disposable Bookworm compiler only; no network, host devices or user data.
set -eu
export LC_ALL=C.UTF-8 DEB_BUILD_MAINT_OPTIONS=hardening=+all
cd /work
cp /source/util-linux_2.38.1* .
printf '%s\n' '0fe5fcd2b83d0465e32ca5cb9d8319e9b6fbf14c9a69abfd7ea905e45fa90b67  util-linux_2.38.1-5+deb12u3.dsc' '60492a19b44e6cf9a3ddff68325b333b8b52b6c59ce3ebd6a0ecaa4c5117e84f  util-linux_2.38.1.orig.tar.xz' 'd46b85313f536fc4831a69ba3fa2c8160450b5b26c7c5dfafce4f078fe4f205c  util-linux_2.38.1-5+deb12u3.debian.tar.xz' | sha256sum -c -
dpkg-source --no-check -x util-linux_2.38.1-5+deb12u3.dsc source > /out/extract.log 2>&1
cd source
eval "$(dpkg-buildflags --export=sh)"
./configure --disable-all-programs --enable-libblkid --enable-libuuid --enable-blkid --disable-nls --disable-static > /out/configure.log 2>&1
make -j2 > /out/baseline-build.log 2>&1
cp .libs/libblkid.so.1.1.0 /out/libblkid-before.so
python3 /recipe/check-blkid.py /out/libblkid-before.so before > /out/before.json
echo 'db3d7342c97323ce462f3e804adc4e593ea76358ac07c8fb30e2c130099c83f9  libblkid/src/partitions/dos.c' | sha256sum -c -
echo '6da66d009b077e17a322621f742b159db5bb52003e2e5297bb847ca529365298  /recipe/blkid-ebr.patch' | sha256sum -c -
git apply --check /recipe/blkid-ebr.patch
git apply /recipe/blkid-ebr.patch
echo 'd7e4c0d147f778df974b71f9e57acb74929de300e058f1386a4a28eb93ba86dc  libblkid/src/partitions/dos.c' | sha256sum -c -
make -j2 > /out/fixed-build.log 2>&1
cp .libs/libblkid.so.1.1.0 /out/libblkid-after.so
python3 /recipe/check-blkid.py /out/libblkid-after.so after > /out/after.json
test "$(id -u)" != 0
make -j2 check > /out/upstream-check.log 2>&1
cp /build-packages.lock /out/
sha256sum /out/libblkid-*.so

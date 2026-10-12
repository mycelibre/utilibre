#!/bin/sh
set -eu
unset LD_LIBRARY_PATH
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1
apt-get -qq update
apt-get -qqy --no-install-recommends install build-essential debhelper-compat autoconf automake \
  libtool pkg-config freeglut3-dev libglu1-mesa-dev libjbig-dev libjpeg-dev liblzma-dev \
  libzstd-dev libwebp-dev libxi-dev zlib1g-dev libdeflate-dev liblerc-dev python3-sphinx \
  debian-keyring gpgv libtiff-dev > /output/dependencies.log 2>&1
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg /sources/tiff_4.7.2-1.dsc > /output/source-signature.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
cc -O2 -Wall /recipes/tiff-native.c $(pkg-config --cflags --libs libtiff-4) -ldl -o /output/tiff-native
nm -D --defined-only /usr/lib/x86_64-linux-gnu/libtiff.so.6 | awk '{print $2,$3}' | sort > /output/old-symbols.txt
readelf -d /usr/lib/x86_64-linux-gnu/libtiff.so.6 > /output/old-dynamic.txt
cd /work
dpkg-source -x /sources/tiff_4.7.2-1.dsc > /output/source-extract.log 2>&1
cd /work/tiff-4.7.2
save_source() {
 result=$?
 find . -name test-suite.log -exec cp {} /output/upstream-tests.log \;
 tar -cJf /output/tiff-4.7.2-native-source.tar.xz -C /work tiff-4.7.2
 exit "$result"
}
trap save_source EXIT
{ printf 'tiff (4.7.2-1~deb13u1+utilibre1) trixie; urgency=high\n\n  * Native Trixie rebuild of upstream 4.7.2 and Debian packaging.\n  * Preserve native codec dependencies and libtiff.so.6 ABI.\n  * No command-line tools are added to the deployed Penpot images.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 14:00:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
cp /work/libtiff6_*utilibre1_amd64.deb /work/libtiff-dev_*utilibre1_amd64.deb /output/
mkdir /output/install
dpkg-deb -x /output/libtiff6_*utilibre1_amd64.deb /output/install
nm -D --defined-only /output/install/usr/lib/x86_64-linux-gnu/libtiff.so.6 | awk '{print $2,$3}' | sort > /output/new-symbols.txt
comm -23 /output/old-symbols.txt /output/new-symbols.txt > /output/missing-symbols.txt
test ! -s /output/missing-symbols.txt
readelf -d /output/install/usr/lib/x86_64-linux-gnu/libtiff.so.6 > /output/new-dynamic.txt
sha256sum /output/*utilibre1_amd64.deb > /output/SHA256SUMS
printf 'passed\n' > /output/build-passed

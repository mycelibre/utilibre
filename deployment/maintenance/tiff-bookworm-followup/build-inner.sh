#!/bin/sh
# Run only in the isolated native Bookworm compiler, after disconnecting its network.
set -eu
unset LD_LIBRARY_PATH
export DEB_BUILD_OPTIONS=parallel=2
TASK=/work/tiff-followup
cd "$TASK"
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg sources/tiff_4.7.2-1.dsc > output/source-signature.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > output/build-packages.lock
test "$(dpkg-query -W -f='${Version}' libc6)" = 2.36-9+deb12u14
test "$(dpkg-query -W -f='${Version}' libtiff6)" = 4.5.0-6+deb12u4
cc -O2 -Wall recipes/tiff-native.c $(pkg-config --cflags --libs libtiff-4) -ldl -o output/tiff-native
nm -D --defined-only /usr/lib/x86_64-linux-gnu/libtiff.so.6 | awk '{print $2,$3}' | sort > output/old-symbols.txt
readelf -d /usr/lib/x86_64-linux-gnu/libtiff.so.6 > output/old-dynamic.txt
dpkg-source -x sources/tiff_4.7.2-1.dsc source > output/source-extract.log 2>&1
cd source
{ printf 'tiff (4.7.2-1~deb12u1+utilibre1) bookworm; urgency=high\n\n  * Native Bookworm rebuild of the official 4.7.2 library and Debian packaging.\n  * Retain libtiff.so.6 ABI, all native codec dependencies and hardening.\n  * No libtiff command-line tools or development package enter production.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 16:00:00 +0000\n\n'; cat debian/changelog; } > ../changelog
mv ../changelog debian/changelog
dpkg-buildpackage -B -us -uc > ../output/build.log 2>&1
find . -name test-suite.log -exec cp {} ../output/upstream-tests.log \;
cp ../libtiff6_*utilibre1_amd64.deb ../libtiff-dev_*utilibre1_amd64.deb ../output/
mkdir ../output/install
dpkg-deb -x ../output/libtiff6_*utilibre1_amd64.deb ../output/install
nm -D --defined-only ../output/install/usr/lib/x86_64-linux-gnu/libtiff.so.6 | awk '{print $2,$3}' | sort > ../output/new-symbols.txt
comm -23 ../output/old-symbols.txt ../output/new-symbols.txt > ../output/missing-symbols.txt
test ! -s ../output/missing-symbols.txt
readelf -d ../output/install/usr/lib/x86_64-linux-gnu/libtiff.so.6 > ../output/new-dynamic.txt
tar -cJf ../output/tiff-4.7.2-bookworm-source.tar.xz -C .. source
sha256sum ../output/*utilibre1_amd64.deb > ../output/SHA256SUMS
printf 'passed\n' > ../output/build-passed

#!/bin/sh
set -eu
unset LD_LIBRARY_PATH
export DEB_BUILD_OPTIONS=parallel=2
cd /work/heif-followup
gpgv --keyring /usr/share/keyrings/debian-keyring.gpg --keyring /usr/share/keyrings/debian-maintainers.gpg sources/libheif_1.15.1-1+deb12u1.dsc > output/source-signature.log 2>&1
test "$(dpkg-query -W -f='${Version}' libc6)" = 2.36-9+deb12u14
test "$(dpkg-query -W -f='${Version}' libheif1)" = 1.15.1-1+deb12u1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > output/build-packages.lock
c++ -O2 -Wall recipes/native.cc $(pkg-config --cflags --libs libheif) -o output/heif-native
nm -D --defined-only /usr/lib/x86_64-linux-gnu/libheif.so.1 | awk '{print $2,$3}' | sort > output/old-symbols.txt
readelf -d /usr/lib/x86_64-linux-gnu/libheif.so.1 > output/old-dynamic.txt
dpkg-source -x sources/libheif_1.15.1-1+deb12u1.dsc source > output/source-extract.log 2>&1
cd source
for commit in b8c12a7b70f46c9516711a988483bed377b78d46 22b6266bf03a9f016f84a9b57b80e1dd7c79d64a; do
 cp "../sources/$commit-path-only.patch" "debian/patches/utilibre-$commit.patch"
 printf '%s\n' "utilibre-$commit.patch" >> debian/patches/series
done
QUILT_PATCHES=debian/patches quilt push -a --fuzz=0 > ../output/patches.log 2>&1
{ printf 'libheif (1.15.1-1+deb12u1+utilibre1) bookworm; urgency=high\n\n  * Preserve Debian fixes; backport official overlay-width and alpha-stride fixes.\n  * Only source filename is adapted; added/deleted upstream code unchanged.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 16:00:00 +0000\n\n'; cat debian/changelog; } > ../changelog
mv ../changelog debian/changelog
dpkg-buildpackage -b -us -uc > ../output/build.log 2>&1
# The release's CMake packaging does not register its existing Catch suite;
# compile the unchanged upstream test sources against the candidate library.
c++ -O1 -I. -Iobj-x86_64-linux-gnu tests/main.cc tests/encode.cc tests/conversion.cc $(find obj-x86_64-linux-gnu/libheif/CMakeFiles/heif.dir -name '*.o') $(pkg-config --libs libde265 x265 aom dav1d) -lz -ldl -lpthread -o ../output/upstream-tests
../output/upstream-tests > ../output/upstream-tests.log 2>&1
c++ -O1 -I. -Iobj-x86_64-linux-gnu ../recipes/overlay.cc $(find obj-x86_64-linux-gnu/libheif/CMakeFiles/heif.dir -name '*.o') $(pkg-config --libs libde265 x265 aom dav1d) -lz -ldl -lpthread -o ../output/overlay-test
../output/overlay-test > ../output/overlay-test.log 2>&1
debian/rules clean > ../output/source-clean.log 2>&1
dpkg-source -b . > ../output/source-build.log 2>&1
cp ../libheif1_*utilibre1_amd64.deb ../libheif-dev_*utilibre1_amd64.deb ../libheif_*utilibre1.dsc ../libheif_*utilibre1.debian.tar.xz ../sources/libheif_1.15.1.orig.tar.gz ../output/
mkdir ../output/install
dpkg-deb -x ../output/libheif1_*utilibre1_amd64.deb ../output/install
nm -D --defined-only ../output/install/usr/lib/x86_64-linux-gnu/libheif.so.1 | awk '{print $2,$3}' | sort > ../output/new-symbols.txt
diff -u ../output/old-symbols.txt ../output/new-symbols.txt > ../output/symbol-diff.txt
readelf -d ../output/install/usr/lib/x86_64-linux-gnu/libheif.so.1 > ../output/new-dynamic.txt
sha256sum ../output/*utilibre1_amd64.deb > ../output/SHA256SUMS
printf 'passed\n' > ../output/build-passed

#!/bin/sh
set -eu
unset LD_LIBRARY_PATH
export DEB_BUILD_OPTIONS='parallel=2 nodoc' MAKEFLAGS=-j2
cd /work/coturn-bson-final
test "$(dpkg-query -W -f='${Version}' libmongoc-dev)" = '1.30.4-1+deb13u3'
cc -O2 -Wall -Wextra recipes/native.c $(pkg-config --cflags --libs libmongoc-1.0) -o output/mongo-native
output/mongo-native > output/old-header-baseline.log
for library in libbson-1.0.so.0 libmongoc-1.0.so.0; do
 nm -D --defined-only "/usr/lib/x86_64-linux-gnu/$library" | awk '{print $2,$3}' | sort > "output/$library.old-symbols"
 readelf -d "/usr/lib/x86_64-linux-gnu/$library" > "output/$library.old-dynamic"
done
cd source
find debian/patches -type f -exec sha256sum {} + | sort > ../output/vendor-patches.sha256
cp ../input/7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d.patch debian/patches/utilibre-CVE-2026-84964.patch
printf '%s\n' utilibre-CVE-2026-84964.patch >> debian/patches/series
QUILT_PATCHES=debian/patches quilt push -a --fuzz=0 > ../output/patch.log 2>&1
{ printf 'mongo-c-driver (1.30.4-1+deb13u3+utilibre1) trixie; urgency=high\n\n  * Preserve Debian patches and backport exact upstream stable OCSP fix 7e4c665.\n  * CVE-2026-84964: reset temporary ownership per OCSP responder iteration.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 17:00:00 +0000\n\n'; cat debian/changelog; } > ../changelog
mv ../changelog debian/changelog
dpkg-buildpackage -B -us -uc > ../output/package-build.log 2>&1
mkdir ../output/install
for package in libbson-1.0-0t64 libmongoc-1.0-0t64; do
 cp "../${package}_1.30.4-1+deb13u3+utilibre1_amd64.deb" ../output/
 dpkg-deb -x "../output/${package}_1.30.4-1+deb13u3+utilibre1_amd64.deb" ../output/install
done
for library in libbson-1.0.so.0 libmongoc-1.0.so.0; do
 nm -D --defined-only "../output/install/usr/lib/x86_64-linux-gnu/$library" | awk '{print $2,$3}' | sort > "../output/$library.new-symbols"
 readelf -d "../output/install/usr/lib/x86_64-linux-gnu/$library" > "../output/$library.new-dynamic"
done
LD_LIBRARY_PATH=../output/install/usr/lib/x86_64-linux-gnu ../output/mongo-native > ../output/old-header-candidate.log
# Debian disables tests in packaging. Enable the unchanged upstream test suite
# in the existing build cache after packaging, without changing shipped flags.
cmake -S . -B obj-x86_64-linux-gnu -DENABLE_TESTS=ON > ../output/test-configure.log 2>&1
cmake --build obj-x86_64-linux-gnu --target mongo_c_driver_tests --parallel 2 > ../output/test-build.log 2>&1
printf '%s\n' 'MONGO_PACKAGE_AND_TESTS_BUILT' > ../output/build-ready

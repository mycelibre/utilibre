#!/bin/sh
set -eu
cd /work/coturn-bson-final/source
cp obj-x86_64-linux-gnu/src/libmongoc/test-libmongoc ../output/candidate-test-libmongoc
sha256sum obj-x86_64-linux-gnu/src/libmongoc/test-libmongoc > ../output/test-executable.sha256
test "$(QUILT_PATCHES=debian/patches quilt top)" = debian/patches/utilibre-CVE-2026-84964.patch
QUILT_PATCHES=debian/patches quilt pop > ../output/baseline-unapply.log 2>&1
cmake --build obj-x86_64-linux-gnu --target test-libmongoc --parallel 2 > ../output/baseline-test-build.log 2>&1
set +e
./obj-x86_64-linux-gnu/src/libmongoc/test-libmongoc -l /bson/validate -l /bson/validate/dbref -F ../output/baseline-bson-results.json > ../output/baseline-bson.log 2>&1
result=$?
set -e
test "$result" = 2
QUILT_PATCHES=debian/patches quilt push --fuzz=0 > ../output/reapply.log 2>&1
DEB_BUILD_OPTIONS='parallel=2 nodoc' dpkg-buildpackage -S -us -uc > ../output/source-build.log 2>&1
cp ../mongo-c-driver_1.30.4-1+deb13u3+utilibre1.dsc ../mongo-c-driver_1.30.4-1+deb13u3+utilibre1.debian.tar.xz ../output/
printf 'passed-with-baseline-failures\n' > ../output/tests-passed

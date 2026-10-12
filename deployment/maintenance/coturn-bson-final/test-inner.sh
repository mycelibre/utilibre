#!/bin/sh
set -eu
cd /work/coturn-bson-final/source
testbin=./obj-x86_64-linux-gnu/src/libmongoc/test-libmongoc
# The upstream fixture performs no HTTP request: NULL certificate ID aborts
# request construction; the second URI covers ownership on parsing failure.
$testbin -l /OCSP/responder/url_parse_errors -F ../output/ocsp-results.json > ../output/ocsp-test.log 2>&1
$testbin -l '/bson/*' -l '/atomic/*' -l '/Uri/*' -F ../output/offline-results.json > ../output/offline-tests.log 2>&1
sha256sum obj-x86_64-linux-gnu/src/libmongoc/test-libmongoc > ../output/test-executable.sha256
# Preserve exact source + Debian packaging and all original patches, without
# carrying compiled objects into the complete corresponding-source offer.
DEB_BUILD_OPTIONS='parallel=2 nodoc' dpkg-buildpackage -S -us -uc > ../output/source-build.log 2>&1
cp ../mongo-c-driver_1.30.4-1+deb13u3+utilibre1.dsc ../mongo-c-driver_1.30.4-1+deb13u3+utilibre1.debian.tar.xz ../output/
printf 'passed\n' > ../output/tests-passed

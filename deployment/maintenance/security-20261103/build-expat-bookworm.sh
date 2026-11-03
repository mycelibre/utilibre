#!/bin/sh
# Run only as uid 65534 in the pinned disposable Bookworm compiler, network none.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
cd /work
if test "${1:-}" != --finish; then
test ! -e expat
dpkg-source -x /source/expat_2.10.0-1.dsc expat
cp /source/expat_2.10.0.orig.tar.gz .
cd expat
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
dch -b --newversion '2.10.0-1~deb12u1+utilibre1' --distribution bookworm \
 'Rebuild authenticated Debian Expat 2.10.0 for Bookworm; retain packaging and ABI.'
export DEB_BUILD_OPTIONS='parallel=1'
dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
# Preserve completed package preparation on a test-only retry.
fi
cd /work/expat
# The upstream suite does not support Debian's unsigned-short UTF-16 build.
# Run the full narrow suite and the explicit native wide-API fixture separately.
make -C build check > /output/tests.log 2>&1
gcc -Wall -Wextra -Werror -O2 -I srcw/lib /wide.c buildw/lib/.libs/libexpatw.so.1 -o /output/wide-native
LD_LIBRARY_PATH=/work/expat/buildw/lib/.libs /output/wide-native > /output/wide-native.log
cp ../libexpat1_2.10.0-1~deb12u1+utilibre1_amd64.deb /output/
cp ../libexpat1-dev_2.10.0-1~deb12u1+utilibre1_amd64.deb /output/
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
cp build/tests/runtests.log /output/native-tests.log
test "$(cat /output/wide-native.log)" = EXPAT_WIDE_PASSED
sha256sum /output/*.deb /output/*tests*.log > /output/SHA256SUMS
echo EXPAT_BOOKWORM_PACKAGES_AND_TESTS_PASSED

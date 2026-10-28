#!/bin/sh
# No network or production volumes. Build/test as an unprivileged user.
set -eu
VERSION=${UTILIBRE_CURL_VERSION:-8.22.0}
case "$VERSION" in 8.22.0|8.23.0) ;; *) exit 2 ;; esac
cd /work
cp /inputs/curl-${VERSION}.tar.xz curl_${VERSION}.orig.tar.xz
tar -xf curl_${VERSION}.orig.tar.xz
cd curl-${VERSION}
tar -xf /inputs/curl_${VERSION}-1.debian.tar.xz
patch --fuzz=0 -p1 < /recipe/curl-preserve-features.patch
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
dch --force-bad-version --newversion "${VERSION}-1~deb13u1+utilibre1" --distribution trixie "Native stable build of signed upstream ${VERSION} with Debian packaging and supported backport QUIC libraries."
# The dependency bootstrap uses 8.21's requirements; independently enforce the
# matching 8.22 package's requirements before building either TLS variant.
dpkg-checkbuilddeps
# Fail rather than silently drop a Debian ABI/build patch that no longer applies.
dpkg-source --before-build . > /output/patch.log 2>&1
dpkg-source -b . > /output/source-package.log 2>&1
cp /build-packages.lock /output/build-packages.lock
chown -R 65534:65534 /work
if ! runuser -u nobody -- env DEB_BUILD_OPTIONS=parallel=2 DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org dpkg-buildpackage -b -us -uc > /output/build.log 2>&1; then
 # Preserve a failed test environment for diagnosis, never treat it as passed.
 tar -C /work -czf /output/failed-build-tree.tar.gz curl-${VERSION}
 exit 1
fi
cp /work/*.deb /work/*.dsc /work/*.tar.* /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
echo NATIVE_CURL_BUILD_AND_UPSTREAM_TESTS_PASSED

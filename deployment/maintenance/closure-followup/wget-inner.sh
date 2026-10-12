#!/bin/sh
# Disposable Trixie container only; caller disconnects network before build.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1
case "${1:-}" in
prepare)
 apt-get update -qq
 apt-get install -y --no-install-recommends build-essential dpkg-dev fakeroot devscripts ca-certificates
 cd /work
 cp /source/wget_1.25.0-2.dsc /source/wget_1.25.0.orig.tar.gz /source/wget_1.25.0.orig.tar.gz.asc /source/wget_1.25.0-2.debian.tar.xz .
 printf '%s\n' '32caf133042db927360a8c35357e4b2877eb83ff0ca144ceb64508947d894f55  wget_1.25.0-2.dsc' '766e48423e79359ea31e41db9e5c289675947a7fcf2efdcedb726ac9d0da3784  wget_1.25.0.orig.tar.gz' '45d4411e892d12af710ddff536d2daf430031387e336153f5f996cf536487b90  wget_1.25.0-2.debian.tar.xz' | sha256sum -c -
 dpkg-source -x wget_1.25.0-2.dsc
 cd wget-1.25.0
 apt-get build-dep -y --no-install-recommends --arch-only .
 printf '%s\n' '1cf705d8020435be06fe8daca1ab3dfa8cd2bc93937b613dfb1c49d56135878e  /source/wget-c2640fe.patch' '0162d60cfe9ad46e47bf1dca59a25b88f26d34546030c0380ae213cb982bf30c  /source/wget-dd692d9.patch' '4e6a2ed1ddc590a0cdd8e94f5b4f35ce49602ff9311689c57263276bb6223bf3  /source/wget-f76978a.patch' | sha256sum -c -
 for id in c2640fe dd692d9 f76978a; do
  patch --dry-run --fuzz=0 -p1 < "/source/wget-$id.patch"
  cp "/source/wget-$id.patch" "debian/patches/utilibre-$id.patch"
  printf '\nutilibre-%s.patch\n' "$id" >> debian/patches/series
  dpkg-source --before-build .
 done
 export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
 dch --newversion '1.25.0-2+utilibre1' 'Backport upstream filename/HTML bounds fixes with the required upstream follow-up regression fix and tests.'
 dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
 chown -R 65534:65534 /work /output
 ;;
build)
 cd /work/wget-1.25.0
 setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-source -b . > /output/source-package.log 2>&1
 setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-buildpackage -B -Pnoudeb -us -uc > /output/build.log 2>&1
 cp /work/wget_1.25.0-2+utilibre1_amd64.deb /work/wget_1.25.0-2+utilibre1.dsc /work/wget_1.25.0-2+utilibre1.debian.tar.xz /work/wget_1.25.0.orig.tar.gz /work/wget_1.25.0.orig.tar.gz.asc /output/
 cp build/tests/unit-tests.log /output/upstream-unit.log
 cp build/tests/test-suite.log /output/upstream-suite.log
 cp build/testenv/test-suite.log /output/upstream-testenv.log
 cp build/fuzz/test-suite.log /output/upstream-fuzz.log
 # Preserve source patches after dpkg-buildpackage un-applies quilt changes.
 setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-source --before-build .
 sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
 echo NATIVE_WGET_BUILD_AND_TESTS_PASSED
 ;;
*) exit 2 ;;
esac

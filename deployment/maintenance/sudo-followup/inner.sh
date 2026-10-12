#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS='parallel=2' LC_ALL=C.UTF-8
case "$1" in
 trixie) VERSION=1.9.16p2-3+deb13u2; UPSTREAM=1.9.16p2 ;;
 bookworm) VERSION=1.9.13p3-1+deb12u4; UPSTREAM=1.9.13p3 ;;
 *) exit 2 ;;
esac
SUITE=$1
case "$2" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts fakeroot python3 quilt
  cd /work
  dpkg-source --no-check -x "/source/sudo_$VERSION.dsc" source
  cd source
  apt-get build-dep -y --no-install-recommends .
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  test -z "$(dpkg --audit)"
  ;;
 build)
  cd /work/source
  test "$(dpkg-parsechangelog -SVersion)" = "$VERSION"
  cp src/sudo.c /output/vendor-sudo.c
  cp debian/patches/series /output/vendor-patch-series
  for commit in db669167ca599f2a94cd8a4c5fae9e473c81a2fd 1820a349687522f51023d1ae5925125f59679a8c; do
   cp "/source/$commit.patch" "debian/patches/utilibre-$commit.patch"
   printf '%s\n' "utilibre-$commit.patch" >> debian/patches/series
  done
  if test "$SUITE" = bookworm; then
   # Context only: this baseline exits, whereas newer sudo returns. No added
   # or deleted line from the upstream security change is altered.
   sed -i 's/^     return EXIT_FAILURE;$/     exit(EXIT_FAILURE);/' debian/patches/utilibre-db669167ca599f2a94cd8a4c5fae9e473c81a2fd.patch
  fi
  QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS='--fuzz=0' quilt push -a > /output/patch.log 2>&1
  cp src/sudo.c /output/repaired-sudo.c
  dch --newversion "$VERSION+utilibre1" --distribution "$SUITE" \
   'Backport both official timezone-environment fixes for CVE-2026-96512; preserve stable sudo/PAM/plugin APIs and Debian security patches.'
  cp "/source/sudo_$UPSTREAM.orig.tar.gz" /work/
  cp "/source/sudo_$UPSTREAM.orig.tar.gz.asc" /work/
  dpkg-source -b . > /output/source.log 2>&1
  chown -R 65534:65534 /work /output
  runuser -u nobody -- dpkg-buildpackage -b -us -uc -j2 > /output/build.log 2>&1
  cp /work/sudo_*utilibre1* /output/
  cp "/source/sudo_$UPSTREAM.orig.tar.gz" /output/
  cp "/source/sudo_$UPSTREAM.orig.tar.gz.asc" /output/
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  printf 'NATIVE_SUDO_BUILD_PASSED\n'
  ;;
 *) exit 2 ;;
esac

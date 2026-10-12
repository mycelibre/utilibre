#!/bin/sh
set -eu
export DEBIAN_FRONTEND=noninteractive
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
export DEB_BUILD_OPTIONS=parallel=2
RECIPE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
case "$1" in
 prepare)
  apt-get update -qq
  apt-get install -y --no-install-recommends build-essential devscripts quilt ca-certificates
  cd /work
  cp /source/openssl_3.0.22* .
  dpkg-source -x openssl_3.0.22-1~deb12u1.dsc openssl > /output/extract.log 2>&1
  cd openssl
  apt-get build-dep -y --no-install-recommends .
  sh "$RECIPE/inner.sh" finish-prepare
  ;;
 finish-prepare)
  cd /work/openssl
  test "$(dpkg-parsechangelog -SVersion)" = '3.0.22-1~deb12u1'
  tar -xOf /ubuntu/openssl_3.0.13-0ubuntu3.16.debian.tar.xz debian/patches/CVE-2026-84782.patch > debian/patches/utilibre-dtls-CVE-2026-84782.patch
  printf '%s\n' '50ad8c00cc9fa93b79704a116df6486461c3192d3412a77749bb4c4cd4692589  debian/patches/utilibre-dtls-CVE-2026-84782.patch' | sha256sum -c -
  node "$RECIPE/refresh-context.mjs" debian/patches/utilibre-dtls-CVE-2026-84782.patch
  # Maintained Ubuntu 3.0 backport, including upstream regression tests.
  # Debian's existing native patches remain applied. Never force failed hunks.
  patch --dry-run --fuzz=0 -p1 < debian/patches/utilibre-dtls-CVE-2026-84782.patch > /output/patch-dry-run.log 2>&1
  printf '%s\n' utilibre-dtls-CVE-2026-84782.patch >> debian/patches/series
  QUILT_PATCHES=debian/patches QUILT_PATCH_OPTS=--fuzz=0 quilt push > /output/patch.log 2>&1
  dch --newversion '3.0.22-1~deb12u1+utilibre1' --distribution bookworm 'Native stable DTLS buffer-state repair using the maintained Ubuntu 3.0 backport and upstream regression tests; preserve Debian configuration and ABI.'
  dpkg-source --before-build .
  dpkg-source -b . > /output/source-package.log 2>&1
  dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
  usermod --home /work nobody
  chown -R 65534:65534 /work /output
  ;;
 build)
  cd /work/openssl
  runuser -u nobody -- env DEB_BUILD_OPTIONS=parallel=2 \
   DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org \
   dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
  cd /work
  cp ./*.dsc ./*.tar.* /output/
  cp ./*.buildinfo ./*.changes /output/
  cp openssl/build_shared/test/dtlstest openssl/apps/server.pem /output/
  for file in ./*.deb; do case "$file" in *-dbgsym_*) ;; *) cp "$file" /output/ ;; esac; done
  sha256sum /output/*.deb /output/*.dsc /output/*.tar.* > /output/SHA256SUMS
  printf '%s\n' OPENSSL_BOOKWORM_NATIVE_UPSTREAM_TESTS_PASSED
  ;;
 *) exit 2 ;;
esac

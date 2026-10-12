#!/bin/sh
# Native Bookworm source backport; no production mounts or package changes.
set -eu
export DEBIAN_FRONTEND=noninteractive DEB_BUILD_OPTIONS=parallel=1 MAKEFLAGS=-j1
apt-get update -qq
apt-get install -y --no-install-recommends build-essential dpkg-dev fakeroot debhelper autoconf libtool automake chrpath lynx libreadline-dev tcl8.6-dev patch ca-certificates
cd /work
cp /prior/sqlite3_3.40.1-2+deb12u2+utilibre1.dsc /prior/sqlite3_3.40.1-2+deb12u2+utilibre1.debian.tar.xz /prior/sqlite3_3.40.1.orig.tar.xz /prior/sqlite3_3.40.1.orig-www.tar.xz .
printf '%s\n' \
 '8b49c25006fe6ef505c6c63fd71cc4b2899fc8ade7fa5689167c106d78b74978  sqlite3_3.40.1-2+deb12u2+utilibre1.dsc' \
 '58549efc4fbdc77c71698e91744d0644b080aee0f225191235634ce100886c7d  sqlite3_3.40.1-2+deb12u2+utilibre1.debian.tar.xz' \
 'aaa776260ab4dc976db34aa7891819484c8676b5b2783123ebc6301e2ca5d655  sqlite3_3.40.1.orig.tar.xz' \
 'a5e95a18d1b59729278860559ded78751b9163ffb5bb906c5cd24c015f71d5fd  sqlite3_3.40.1.orig-www.tar.xz' \
 '59d33bc436258603702bb051d645743ab03612b82f79e7c7d638c65127c21261  /source/sqlite3_3.46.1-7+deb13u2.debian.tar.xz' | sha256sum -c -
dpkg-source -x sqlite3_3.40.1-2+deb12u2+utilibre1.dsc
cd sqlite3-3.40.1
tar -xOf /source/sqlite3_3.46.1-7+deb13u2.debian.tar.xz debian/patches/54-CVE-2026-11822_CVE-2026-11824.patch > /output/fts-upstream.patch
printf '%s\n' '683a169fc6eaf31ddf41b0e106859c5cd3b2c95076367d9fdc6264c90eeca1c0  /output/fts-upstream.patch' | sha256sum -c -
patch --dry-run --fuzz=0 -p1 < /output/fts-upstream.patch > /output/patch.log
cp /output/fts-upstream.patch debian/patches/utilibre-fts-corruption.patch
printf '\nutilibre-fts-corruption.patch\n' >> debian/patches/series
{ printf 'sqlite3 (3.40.1-2+deb12u2+utilibre2) bookworm; urgency=high\n\n  * Preserve the earlier DISTINCT repair and backport upstream FTS5\n    corrupt-leaf bound and its regression, from signed Debian source.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 12 Oct 2026 07:00:00 +0000\n\n'; cat debian/changelog; } > /work/changelog
mv /work/changelog debian/changelog
dpkg-source --before-build .
cmp debian/rules /prior/debian-rules.original
dpkg-source -b . > /output/source-package.log 2>&1
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
chown -R 65534:65534 /work /output
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
# dpkg-buildpackage un-applies quilt patches after producing the binaries.
# Restore the exact source before building the independent regression runner.
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work dpkg-source --before-build .
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work make -j1 testfixture USE_AMALGAMATION=1 > /output/test-build.log 2>&1
# Keep the independent rerun inputs before applying the test-only adaptation.
tar -czf /output/fts-test-harness.tar.gz testfixture test ext/fts5/test config.log Makefile
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work ./testfixture test/distinct.test > /output/distinct-patched-tests.log 2>&1
patch --dry-run --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
patch --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work ./testfixture ext/fts5/test/fts5corruptA.test > /output/fts-compatible-tests.log 2>&1
grep -q '0 errors out of 7 tests' /output/fts-compatible-tests.log
cp /work/libsqlite3-0_3.40.1-2+deb12u2+utilibre2_amd64.deb /work/sqlite3_3.40.1-2+deb12u2+utilibre2_amd64.deb /work/sqlite3_3.40.1-2+deb12u2+utilibre2.dsc /work/sqlite3_3.40.1-2+deb12u2+utilibre2.debian.tar.xz /work/sqlite3_3.40.1.orig.tar.xz /work/sqlite3_3.40.1.orig-www.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
echo NATIVE_SQLITE_FTS_BUILD_AND_REGRESSIONS_PASSED

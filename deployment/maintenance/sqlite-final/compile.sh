#!/bin/sh
set -eu
cd /work/sqlite3-3.40.1
node /recipe/patch.mjs
dpkg-source --before-build .
cmp debian/rules /out/debian-rules.original
dpkg-source -b .
cp ../sqlite3_3.40.1-2+deb12u2+utilibre1.debian.tar.xz ../sqlite3_3.40.1-2+deb12u2+utilibre1.dsc /out/
export DEB_BUILD_OPTIONS='parallel=1'
export MAKEFLAGS=-j1
if [ "${1:-}" != '--resume-tests' ]; then
  dpkg-buildpackage -B -us -uc
fi
# This is the upstream native test runner, not an approximation of its SQL.
# Its non-amalgamated TESTSRC2 repeats fts3_term.c from TESTSRC in this release.
# Use upstream's standard amalgamation test target; installed .debs above keep
# Debian's original non-amalgamation flags and are independently probed below.
make -j1 testfixture USE_AMALGAMATION=1
./testfixture test/distinct.test > /out/distinct-tests.log 2>&1
grep -q 'distinct-10.1.*Ok' /out/distinct-tests.log
grep -q 'distinct-10.5.*Ok' /out/distinct-tests.log
node /recipe/extract-fixtures.mjs
gcc -O2 -Werror -Wall -I. /recipe/probe.c -L.libs -lsqlite3 -o /out/sqlite-probe
cp ../libsqlite3-0_3.40.1-2+deb12u2+utilibre1_amd64.deb /out/
cp ../sqlite3_3.40.1-2+deb12u2+utilibre1_amd64.deb /out/
cp ../libsqlite3-tcl_3.40.1-2+deb12u2+utilibre1_amd64.deb /out/
cp ../sqlite3_3.40.1-2+deb12u2+utilibre1_amd64.buildinfo /out/
cp ../sqlite3_3.40.1.orig.tar.xz ../sqlite3_3.40.1.orig-www.tar.xz /out/
cp debian/patches/CVE-2025-7458.patch /out/applied.patch
cp test/distinct.test /out/distinct.test
dpkg-query -W -f='${Package}\t${Version}\n' > /out/builder-packages.tsv
sha256sum /out/*.deb /out/*.tar.xz /out/*.dsc /out/applied.patch > /out/SHA256SUMS
printf '%s\n' COMPILED

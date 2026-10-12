#!/bin/sh
# Re-run a test-only upstream runner against the already-built native source.
# The original failed test logs remain intact; this never changes binaries.
set -eu
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y --no-install-recommends build-essential tcl8.6-dev dpkg-dev
cd /work
cp /output/sqlite3_3.40.1-2+deb12u2+utilibre2.dsc /output/sqlite3_3.40.1-2+deb12u2+utilibre2.debian.tar.xz /output/sqlite3_3.40.1.orig.tar.xz /output/sqlite3_3.40.1.orig-www.tar.xz .
printf '%s\n' \
 '070eab3c6f2613c686a5b593a0fd7f99a6fdaa8d6bdf1467a3aa32b85bc2ad6e  /output/libsqlite3-0_3.40.1-2+deb12u2+utilibre2_amd64.deb' \
 '692f5f10d7953afb9d5ec3ff24d3a79ad31b87e2b49e36c041920215fee2bb5f  /output/sqlite3_3.40.1-2+deb12u2+utilibre2_amd64.deb' | sha256sum -c -
dpkg-source -x sqlite3_3.40.1-2+deb12u2+utilibre2.dsc
cd sqlite3-3.40.1
grep -F 'pRet->szLeaf<4 || pRet->szLeaf>pRet->nn' ext/fts5/fts5_index.c
test -f ext/fts5/test/fts5corruptA.test
chown -R 65534:65534 /work
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work CFLAGS=-O1 ./configure --enable-fts5 > /output/fts-configure.log 2>&1
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work make -j1 testfixture USE_AMALGAMATION=1 > /output/fts-test-build.log 2>&1
# Retain the exact runner and test inputs before execution for a bounded rerun.
tar -czf /output/fts-test-harness.tar.gz testfixture test ext/fts5/test config.log Makefile
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work ./testfixture test/distinct.test > /output/distinct-patched-tests.log 2>&1
patch --dry-run --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
patch --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
setpriv --reuid=65534 --regid=65534 --clear-groups env HOME=/work ./testfixture ext/fts5/test/fts5corruptA.test > /output/fts-compatible-tests.log 2>&1
grep -q '0 errors out of 7 tests' /output/fts-compatible-tests.log
echo PATCHED_SQLITE_FTS_TESTS_PASSED

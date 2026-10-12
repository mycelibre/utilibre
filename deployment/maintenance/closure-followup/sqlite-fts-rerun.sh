#!/bin/sh
# Run as uid 65534 in a disconnected disposable Bookworm container.
set -eu
cd /work
tar -xzf /output/fts-test-harness.tar.gz
patch --dry-run --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
patch --fuzz=0 -p1 < /recipe/sqlite-fts-test-compat.patch
./testfixture ext/fts5/test/fts5corruptA.test > /output/fts-compatible-tests.log 2>&1
grep -q '0 errors out of 7 tests' /output/fts-compatible-tests.log
test -f /output/fts-corrupt.db
gcc -O2 -Wall -Werror /recipe/sqlite-fts-probe.c -lsqlite3 -o /output/sqlite-fts-probe
dpkg-deb -x /output/libsqlite3-0_3.40.1-2+deb12u2+utilibre2_amd64.deb /work/repaired
LD_LIBRARY_PATH=/work/repaired/usr/lib/x86_64-linux-gnu /output/sqlite-fts-probe /output/fts-corrupt.db
echo PATCHED_SQLITE_FTS_COMPATIBLE_AND_NATIVE_PASSED

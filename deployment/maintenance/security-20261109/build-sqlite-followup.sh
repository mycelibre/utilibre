#!/bin/sh
# Finite continuation of security-20261103/build-sqlite.sh. No live data.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
case "$1" in
 bookworm) input=3.40.1-2+deb12u2+utilibre3; output=3.40.1-2+deb12u2+utilibre4;;
 trixie) input=3.46.1-7+deb13u2+utilibre1; output=3.46.1-7+deb13u2+utilibre2;;
 *) exit 2;;
esac
cd /work
test ! -e source
cp /input/* .
dpkg-source -x "sqlite3_${input}.dsc" source > /output/extract.log 2>&1
cd source
python3 - "$1" <<'PY'
import hashlib,json,sys
from pathlib import Path
s=json.loads(Path('/recipe/sqlite-source.json').read_text())['suites'][sys.argv[1]]
for name,expected in s['filePreconditions'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==expected, name
for p in s['patches']:
    assert hashlib.sha256((Path('/recipe')/p['file']).read_bytes()).hexdigest()==p['sha256']
PY
sha256sum ext/fts5/fts5_index.c ext/session/sqlite3session.c debian/rules > /output/source-before.sha256
cp debian/rules /output/debian-rules.original
for patchfile in "sqlite-session-$1.patch" $(test "$1" != trixie || echo sqlite-secure-delete-trixie.patch); do
 patch --batch --dry-run --fuzz=0 -p1 < "/recipe/$patchfile" >> /output/patch.log
 cp "/recipe/$patchfile" "debian/patches/utilibre-$patchfile"
 printf '\nutilibre-%s\n' "$patchfile" >> debian/patches/series
 dpkg-source --before-build . >> /output/quilt.log 2>&1
done
python3 - "$output" "$1" <<'PY'
import hashlib,json,sys
from pathlib import Path
s=json.loads(Path('/recipe/sqlite-source.json').read_text())['suites'][sys.argv[2]]
for name,expected in s['filePostconditions'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==expected, name
p=Path('debian/changelog')
p.write_text(f'sqlite3 ({sys.argv[1]}) {sys.argv[2]}; urgency=high\n\n  * Backport upstream changeset table-boundary correction.\n  * Guard FTS5 secure-delete offsets where the feature is present.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 09 Nov 2026 21:00:00 +0000\n\n'+p.read_text())
PY
cmp debian/rules /output/debian-rules.original
sha256sum ext/fts5/fts5_index.c ext/session/sqlite3session.c debian/rules > /output/source-after.sha256
dpkg-source -b . > /output/source-package.log 2>&1
DEB_BUILD_OPTIONS=parallel=1 MAKEFLAGS=-j1 dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
dpkg-source --before-build .
make -j1 testfixture USE_AMALGAMATION=1 > /output/test-build.log 2>&1
./testfixture ext/fts5/test/fts5prefix2.test > /output/fts-prefix-tests.log 2>&1
./testfixture test/distinct.test > /output/distinct-tests.log 2>&1
./testfixture ext/fts5/test/fts5integrity2.test > /output/integrity-tests.log 2>&1
./testfixture ext/session/session1.test > /output/session-tests.log 2>&1
if test "$1" = trixie; then
 for suffix in '' 2 3 4 5 6 7 8; do
  ./testfixture "ext/fts5/test/fts5secure$suffix.test" > "/output/secure$suffix-tests.log" 2>&1
 done
fi
cp ../libsqlite3-0_"${output}"_amd64.deb ../sqlite3_"${output}"_amd64.deb ../libsqlite3-dev_"${output}"_amd64.deb ../sqlite3_"${output}".dsc ../sqlite3_"${output}".debian.tar.xz /output/
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
echo SQLITE_FOLLOWUP_NATIVE_PACKAGES_AND_REGRESSIONS_PASSED

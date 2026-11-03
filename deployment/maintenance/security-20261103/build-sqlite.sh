#!/bin/sh
# Fixed source inputs are validated by the host wrapper before this networkless
# unprivileged build. Retain old DISTINCT/corrupt-page patches and distro flags.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
case "$1" in
 bookworm) input=3.40.1-2+deb12u2+utilibre2; output=3.40.1-2+deb12u2+utilibre3;;
 trixie) input=3.46.1-7+deb13u2; output=3.46.1-7+deb13u2+utilibre1;;
 *) exit 2;;
esac
cd /work
test ! -e source
cp /input/* .
dpkg-source -x "sqlite3_${input}.dsc" baseline > /output/extract.log 2>&1
cd baseline
sha256sum ext/fts5/fts5_index.c ext/fts5/test/fts5prefix2.test debian/rules > /output/source-before.sha256
python3 - "$1" <<'PY'
import hashlib,json,sys
from pathlib import Path
spec=json.loads(Path('/recipe/sqlite-source.json').read_text())['suites'][sys.argv[1]]
for name,expected in spec['filePreconditions'].items():
    assert hashlib.sha256(Path(name).read_bytes()).hexdigest()==expected, name
PY
cp debian/rules /output/debian-rules.original
./configure --enable-fts5 > /output/baseline-configure.log 2>&1
make -j1 sqlite3.c > /output/baseline-amalgamation.log 2>&1
cc -g -O1 -fsanitize=address,undefined -fno-sanitize-recover=all -DSQLITE_ENABLE_FTS5 -I. sqlite3.c /recipe/sqlite-rowid.c -lm -ldl -lpthread -o /output/before-sanitized
set +e
ASAN_OPTIONS=detect_leaks=0:abort_on_error=1 UBSAN_OPTIONS=halt_on_error=1 /output/before-sanitized > /output/before-sanitized.log 2>&1
result=$?
set -e
test "$result" != 0
grep -Eq 'heap-buffer-overflow|signed integer overflow' /output/before-sanitized.log
printf '%s\n' "$result" > /output/baseline-exit-status
# A separate fresh extraction prevents amalgamation-generated headers from
# becoming unintended source-package changes.
cd /work
dpkg-source -x "sqlite3_${input}.dsc" source > /output/candidate-extract.log 2>&1
cd source
if test "$1" = trixie; then
 patch --batch --dry-run --fuzz=0 -p1 < /recipe/sqlite-trixie-prerequisite.patch > /output/prerequisite-patch.log
 cp /recipe/sqlite-trixie-prerequisite.patch debian/patches/utilibre-unsigned-delta.patch
 printf '\nutilibre-unsigned-delta.patch\n' >> debian/patches/series
 dpkg-source --before-build .
fi
patchfile=/recipe/sqlite-rowid.patch
if test "$1" = bookworm; then patchfile=/recipe/sqlite-rowid-bookworm.patch; fi
patch --batch --dry-run --fuzz=0 -p1 < "$patchfile" > /output/patch.log
cp "$patchfile" debian/patches/utilibre-negative-rowid.patch
printf '\nutilibre-negative-rowid.patch\n' >> debian/patches/series
export DEBFULLNAME='Utilibre maintainers' DEBEMAIL=admin@utilibre.org
# Keep the package's exact native build configuration and existing patch series.
python3 - "$output" "$1" <<'PY'
import sys
from pathlib import Path
p=Path('debian/changelog')
p.write_text(f'sqlite3 ({sys.argv[1]}) {sys.argv[2]}; urgency=high\n\n  * Backport upstream negative FTS5 rowid bound and unsigned deltas.\n\n -- Utilibre maintainers <admin@utilibre.org>  Tue, 03 Nov 2026 22:00:00 +0000\n\n'+p.read_text())
PY
dpkg-source --before-build .
sha256sum ext/fts5/fts5_index.c ext/fts5/test/fts5prefix2.test debian/rules > /output/source-after.sha256
cmp debian/rules /output/debian-rules.original
dpkg-source -b . > /output/source-package.log 2>&1
DEB_BUILD_OPTIONS=parallel=1 MAKEFLAGS=-j1 dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
dpkg-source --before-build .
make -j1 testfixture USE_AMALGAMATION=1 > /output/test-build.log 2>&1
./testfixture ext/fts5/test/fts5prefix2.test > /output/fts-prefix-tests.log 2>&1
./testfixture test/distinct.test > /output/distinct-tests.log 2>&1
./testfixture ext/fts5/test/fts5integrity2.test > /output/integrity-tests.log 2>&1
cc -g -O1 -fsanitize=address,undefined -fno-sanitize-recover=all -DSQLITE_ENABLE_FTS5 -I. sqlite3.c /recipe/sqlite-rowid.c -lm -ldl -lpthread -o /output/after-sanitized
ASAN_OPTIONS=detect_leaks=0:abort_on_error=1 UBSAN_OPTIONS=halt_on_error=1 /output/after-sanitized > /output/after-sanitized.log 2>&1
cp ../libsqlite3-0_"${output}"_amd64.deb ../sqlite3_"${output}"_amd64.deb ../libsqlite3-dev_"${output}"_amd64.deb ../sqlite3_"${output}".dsc ../sqlite3_"${output}".debian.tar.xz /output/
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
echo SQLITE_NATIVE_PACKAGES_REGRESSIONS_AND_SANITIZERS_PASSED

#!/bin/sh
# Pinned source, isolated compiler; never installs packages on this host.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
ulimit -c 0
cd /work
python3 - <<'PY'
import hashlib,json
from pathlib import Path
s=json.loads(Path('/recipe/zlib-bookworm-source.json').read_text())
for name,expected in s['files'].items():
    assert hashlib.sha256((Path('/input')/name).read_bytes()).hexdigest()==expected
assert hashlib.sha256(Path('/recipe/zlib-bookworm.patch').read_bytes()).hexdigest()==s['patchSha256']
PY
cp /input/zlib_* .
dpkg-source -x zlib_1.2.13.dfsg-1.dsc baseline > /output/extract.log 2>&1
python3 - <<'PY'
import hashlib,json
from pathlib import Path
s=json.loads(Path('/recipe/zlib-bookworm-source.json').read_text())
for name,expected in s['preconditions'].items():
    assert hashlib.sha256((Path('baseline')/name).read_bytes()).hexdigest()==expected
assert 'gz_vacate' not in Path('baseline/gzwrite.c').read_text()
PY
cp -a baseline package
(cd package; patch --batch --fuzz=0 --no-backup-if-mismatch -p1 < /recipe/zlib-bookworm.patch)
# Native package build below runs the upstream static/shared/64-bit suites.
# Historical diagnostic receipts are a separate protected assessment input;
# building this package does not regenerate or claim those results.
cd package
cp debian/rules /output/debian-rules.original
cp /recipe/zlib-bookworm.patch debian/patches/utilibre-write-error.patch
printf '\nutilibre-write-error.patch\n' >> debian/patches/series
python3 - <<'PY'
from pathlib import Path
p=Path('debian/changelog')
p.write_text('zlib (1:1.2.13.dfsg-1+utilibre1) bookworm; urgency=high\n\n  * Backport upstream df84af25 input-state reset after a failed write.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 09 Nov 2026 21:45:00 +0000\n\n'+p.read_text())
PY
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-source -b . > /output/source-package.log 2>&1
DEB_BUILD_PROFILES=nobiarch DEB_BUILD_OPTIONS=parallel=1 MAKEFLAGS=-j1 dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
cmp debian/rules /output/debian-rules.original
cp ../zlib1g_1.2.13.dfsg-1+utilibre1_amd64.deb ../zlib1g-dev_1.2.13.dfsg-1+utilibre1_amd64.deb ../zlib_1.2.13.dfsg-1+utilibre1.dsc ../zlib_1.2.13.dfsg-1+utilibre1.debian.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
echo ZLIB_BOOKWORM_BUILD_PASSED

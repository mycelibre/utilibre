#!/bin/sh
# Native Bookworm build of authenticated Debian source; no production data.
set -eu
test -f /.dockerenv
test "$(id -u)" = 65534
cd /work
python3 - <<'PY'
import hashlib,json
from pathlib import Path
s=json.loads(Path('/recipe/rsync-source.json').read_text())
for name,expected in s['files'].items():
    assert hashlib.sha256((Path('/input')/name).read_bytes()).hexdigest()==expected,name
PY
cp /input/rsync_* .
dpkg-source -x rsync_3.5.2+ds1-2.dsc source > /output/extract.log 2>&1
cd source
cp debian/rules /output/debian-rules.original
python3 - <<'PY'
from pathlib import Path
p=Path('debian/changelog')
p.write_text('rsync (3.5.2+ds1-2~deb12u1+utilibre1) bookworm; urgency=high\n\n  * Rebuild authenticated upstream release against Bookworm libraries.\n\n -- Utilibre maintainers <admin@utilibre.org>  Mon, 09 Nov 2026 21:00:00 +0000\n\n'+p.read_text())
PY
dpkg-query -W -f='${binary:Package}=${Version}\n' | sort > /output/build-packages.lock
dpkg-source -b . > /output/source-package.log 2>&1
DEB_BUILD_OPTIONS=parallel=1 MAKEFLAGS=-j1 dpkg-buildpackage -B -us -uc > /output/build.log 2>&1
cmp debian/rules /output/debian-rules.original
cp ../rsync_3.5.2+ds1-2~deb12u1+utilibre1_amd64.deb ../rsync_3.5.2+ds1-2~deb12u1+utilibre1.dsc ../rsync_3.5.2+ds1-2~deb12u1+utilibre1.debian.tar.xz /output/
sha256sum /output/*.deb /output/*.dsc /output/*.tar.xz > /output/SHA256SUMS
echo RSYNC_NATIVE_BUILD_PASSED

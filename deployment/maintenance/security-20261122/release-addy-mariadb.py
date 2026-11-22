"""Use the existing scoped Compose release and rollback gate for Addy."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert len(sys.argv) == 2 and sys.argv[1] in ('check', 'apply', 'verify')
source = HERE / 'release-nginx.py'
code = source.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')')
assert code.count("HERE/'nginx-inputs.json'") == 2
code = code.replace("HERE/'nginx-inputs.json'", "HERE/'addy-mariadb-inputs.json'")
assert code.count("ROOT/'nginx'") == 2
code = code.replace("ROOT/'nginx'", "ROOT/'addy-mariadb'")
replace("ROOT/'release-nginx-adapter-v3.mjs'", "ROOT/'release-addy-mariadb-adapter.mjs'")
replace("ROOT/'release-adapter.json'", "ROOT/'addy-mariadb/release-adapter.json'")
adapter = ROOT / 'addy-mariadb/release-driver.py'
if adapter.exists():
    assert adapter.read_text() == code, 'Release driver drift'
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'addy-mariadb/release-driver.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['finite Addy manifest', 'private candidate evidence path',
                'dedicated retained release adapter'],
}, indent=2) + '\n')
sys.argv = [str(adapter), sys.argv[1], 'addy-mariadb']
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})

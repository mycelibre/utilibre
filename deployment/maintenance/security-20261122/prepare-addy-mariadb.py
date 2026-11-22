"""Reuse the signed Alpine package and full-image scope gate for Addy.

The adapter only selects the reviewed client packages and Addy's Nginx version.
It makes no network request, changes no production image and sends no email.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] == ['prepare']
source = HERE / 'prepare-nginx.py'
code = source.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')')
replace("HERE/'nginx-inputs.json'", "HERE/'addy-mariadb-inputs.json'")
replace("ROOT/'packages'/p['file']", "ROOT/'addy-mariadb/packages'/p['file']")
assert code.count("ROOT/'nginx'") == 2
code = code.replace("ROOT/'nginx'", "ROOT/'addy-mariadb'")
replace("assert 'nginx/1.30.' in info", "assert 'nginx/1.28.3' in info")
adapter = ROOT / 'addy-mariadb/prepare-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code, 'Prepared adapter drift'
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'addy-mariadb/adapter.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['finite Addy manifest', 'private candidate path',
                'Addy Nginx version check'],
}, indent=2) + '\n')
sys.argv = [str(adapter), 'addy-mariadb']
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})

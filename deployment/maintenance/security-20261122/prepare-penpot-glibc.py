"""Reuse the exact Debian package builder for two pinned Penpot DHI roles."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in (['expanded-penpot-frontend-glibc'],
                         ['expanded-penpot-exporter-glibc'])
source = HERE / 'prepare-debian.py'
code = source.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')')
replace('debian-inputs.json', 'penpot-glibc-inputs.json')
old_regex = r"/^\/[\w/+.@:-]+$/"
new_regex = r"/^\/[\w/+.@:,-]+$/"
replace('code=code.replace(needle,checks+needle)',
        'code=code.replace(needle,checks+needle)\n'
        'assert code.count(' + repr(old_regex) + ')==1\n'
        'code=code.replace(' + repr(old_regex) + ',' + repr(new_regex) + ')')
replace("ROOT/'prepare-debian-adapter.mjs'", "ROOT/'prepare-penpot-glibc-adapter.mjs'")
replace("ROOT/'debian-build-adapter.json'", "ROOT/'penpot-glibc-build-adapter.json'")
adapter = ROOT / 'penpot-glibc-preparation-driver.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'penpot-glibc-preparation-driver.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['exact DHI package manifest', 'isolated preparation adapter path'],
}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})

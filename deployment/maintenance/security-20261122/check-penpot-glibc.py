"""Reuse Penpot's offline static and font rendering checks on both candidates."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in (['frontend'], ['font'])
source = HERE / 'check-dhi-apps.py'
code = source.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE = Path(__file__).resolve().parent\nROOT = ',
        'HERE = Path(' + repr(str(HERE)) + ')\nROOT = ')
replace("ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/dhi-successors')",
        'ROOT = Path(' + repr(str(ROOT)) + ')')
replace("HERE / 'dhi-successor-inputs.json'", "HERE / 'penpot-glibc-inputs.json'")
replace("key = 'expanded-penpot-' + ('frontend' if mode == 'frontend' else 'exporter')",
        "key = 'expanded-penpot-' + ('frontend' if mode == 'frontend' else 'exporter') + '-glibc'")
adapter = ROOT / 'check-penpot-glibc-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'check-penpot-glibc-adapter.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['exact Penpot DHI manifest', 'candidate evidence path and key'],
}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})

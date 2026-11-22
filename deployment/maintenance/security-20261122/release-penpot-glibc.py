"""Apply the retained scoped Compose release gate to exact Penpot candidates."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert len(sys.argv) == 3 and sys.argv[1] in ('check', 'apply', 'verify')
source = HERE / 'release-debian.py'
code = source.read_text()
assert code.count('HERE = Path(__file__).resolve().parent') == 1
code = code.replace('HERE = Path(__file__).resolve().parent',
                    'HERE = Path(' + repr(str(HERE)) + ')')
assert code.count('debian-inputs.json') == 2
code = code.replace('debian-inputs.json', 'penpot-glibc-inputs.json')
assert code.count("ROOT / 'release-debian-adapter-v4.mjs'") == 1
code = code.replace("ROOT / 'release-debian-adapter-v4.mjs'",
                    "ROOT / 'release-penpot-glibc-adapter.mjs'")
assert code.count("ROOT / 'release-debian-adapter.json'") == 1
code = code.replace("ROOT / 'release-debian-adapter.json'",
                    "ROOT / 'release-penpot-glibc-adapter.json'")
adapter = ROOT / 'release-penpot-glibc-driver-v2.py'
if adapter.exists():
    assert adapter.read_text() == code, 'Release adapter drift'
else:
    adapter.write_text(code)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT / 'release-penpot-glibc-driver.json').write_text(json.dumps({
    'sourceSha256': sha(source), 'adapterSha256': sha(adapter),
    'changes': ['Exact signed DHI Penpot package manifest and evidence paths',
                'Dedicated retained release adapter; all advisory findings preserved'],
}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'),
     {'__file__': str(adapter), '__name__': '__main__'})

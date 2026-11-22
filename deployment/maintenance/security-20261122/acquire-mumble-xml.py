"""One exact Ubuntu XML package, using the existing signed archive downloader.

Three bounded official requests; no installed packages, services or secrets.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/mumble-xml')
assert sys.argv[1:] == ['--download']
ROOT.mkdir(mode=0o700, exist_ok=True)
(ROOT / 'debian-acquisition').mkdir(mode=0o700, exist_ok=True)
original = HERE.parent / 'security-20261109/acquire-debian.py'
code = original.read_text()


def replace(before, after):
    global code
    assert code.count(before) == 1
    code = code.replace(before, after)


replace("Path('/var/lib/utilibre-maintenance/security-20261109')", 'Path(' + repr(str(ROOT)) + ')')
replace("want={'noble':{'apt':'2.8.4ubuntu0.1','libapt-pkg6.0t64':'2.8.4ubuntu0.1'},\n          'jammy':{'apt':'2.4.15ubuntu0.1','libapt-pkg6.0':'2.4.15ubuntu0.1'}}",
        "want={'noble':{'libxml2':'2.9.14+dfsg-1.3ubuntu3.10'}}")
adapter = ROOT / 'acquire-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / 'acquisition-adapter.json').write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(adapter.read_bytes()).hexdigest(),
    'purpose': 'Exact Noble libxml2 successor; separate Ubuntu signature evidence'}, indent=2) + '\n')
sys.argv = [str(adapter), '--download', '--ubuntu']
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

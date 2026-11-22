"""Finite signed vendor acquisition; no candidate build or production effects."""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
assert sys.argv[1:] == ['--download']
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/leaves')
ROOT.mkdir(mode=0o700, exist_ok=True)
original = HERE / 'acquire-debian.py'
code = original.read_text()
for old, new in [
    ('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')'),
    ("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')'),
    ("'debian-wanted.json'", "'debian-leaf-wanted.json'"),
]:
    assert code.count(old) >= 1
    code = code.replace(old, new)
adapter = ROOT / 'acquire-leaf-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

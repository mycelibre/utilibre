"""Read-only identity check for the finite November CryptPad release."""
import hashlib
import json
import os
import sys
from pathlib import Path

assert len(sys.argv) == 3
root = Path(sys.argv[1])
assert str(root) in (
    '/opt/utilibre/src/cryptpad',
    '/var/lib/utilibre-maintenance/held-upgrades-20261111/cryptpad/activation-source',
)
expected = sys.argv[2]
assert len(expected) == 64 and all(c in '0123456789abcdef' for c in expected)
files = {}
for base, directories, names in os.walk(root):
    directories[:] = sorted(d for d in directories if d != '.git')
    for name in sorted(names):
        file = Path(base) / name
        files[str(file.relative_to(root))] = (
            'link:' + os.readlink(file) if file.is_symlink()
            else hashlib.sha256(file.read_bytes()).hexdigest()
        )
actual = hashlib.sha256(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
assert actual == expected, 'Source tree changed after verification'
print('Exact CryptPad tree identity verified')

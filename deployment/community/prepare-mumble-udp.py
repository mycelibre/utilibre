#!/usr/bin/env python3
"""Fetch the pinned upstream UDP crypto helper and preserve its licence."""
import hashlib
from pathlib import Path
import sys
import urllib.request

PIN = 'a560e6013dfbccb3666ce8756e1ca6b790bf05c8'
FILES = {
    'pymumble_py3/crypto.py': ('crypto.py', '95acb03af24bf06e648ca51eedfae26a9d5e316b8203faf1a9580e50ba05ce04'),
    'LICENSE': ('LICENSE', '321429c853d59b621414832581e93ff38586c348aa2de43c7e571b33423d670a'),
}
destination = Path(sys.argv[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
for source, (name, expected) in FILES.items():
    url = f'https://raw.githubusercontent.com/azlux/pymumble/{PIN}/{source}'
    with urllib.request.urlopen(url, timeout=20) as response:
        data = response.read(128 * 1024)
    if hashlib.sha256(data).hexdigest() != expected:
        raise SystemExit('Pinned upstream helper or licence checksum mismatch')
    (destination / name).write_bytes(data)
(destination / 'SOURCE.txt').write_text(f'Unmodified azlux/pymumble {PIN}\nOnly crypto.py is loaded for this bounded test; no client/audio backend is installed.\nhttps://github.com/azlux/pymumble/tree/{PIN}\n')
print('Pinned upstream helper and original licence prepared.')

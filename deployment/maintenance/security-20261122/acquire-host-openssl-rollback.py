"""Fetch four exact rollback packages through the retained signed index."""
import hashlib
import json
import lzma
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

os.umask(0o077)
assert sys.argv[1:] == ['--download']
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
pool = ROOT / 'debian-acquisition/trixie-security'
out = ROOT / 'host-openssl/rollback'
out.mkdir(mode=0o700, exist_ok=True)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
verified = out / 'verified-release'
assert not verified.exists()
subprocess.run(['sqv', '--keyring', '/usr/share/keyrings/debian-archive-keyring.pgp', '--cleartext',
                '--output', str(verified), str(pool / 'InRelease')], check=True, capture_output=True, timeout=30)
entry = next(l.split() for l in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/binary-amd64/Packages.xz'))
index = pool / 'Packages.xz'
assert sha(index) == entry[0] and index.stat().st_size == int(entry[1])
names = {'openssl', 'libssl3t64', 'libssl-dev', 'openssl-provider-legacy'}
records = []
for block in lzma.decompress(index.read_bytes()).decode().split('\n\n'):
    fields = dict(l.split(': ', 1) for l in block.splitlines() if ': ' in l and not l.startswith(' '))
    if fields.get('Package') not in names or fields.get('Version') != '3.5.7-1~deb13u3':
        continue
    name = fields['Package']
    assert fields['Filename'].startswith('pool/updates/main/o/openssl/') and '..' not in fields['Filename']
    url = 'https://deb.debian.org/debian-security/' + fields['Filename']
    file = out / Path(fields['Filename']).name
    size = int(fields['Size'])
    assert size < 8 * 1024**2
    if not file.exists():
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://deb.debian.org/')
            blob = response.read(8 * 1024**2 + 1)
        assert len(blob) == size and hashlib.sha256(blob).hexdigest() == fields['SHA256']
        file.write_bytes(blob)
    assert sha(file) == fields['SHA256'] and file.stat().st_size == size
    records.append({'package': name, 'version': fields['Version'], 'file': file.name,
                    'sha256': fields['SHA256'], 'url': url})
assert len(records) == 4 and {r['package'] for r in records} == names
(out / 'authenticated.json').write_text(json.dumps({'packages': records, 'indexSha256': sha(index),
    'releaseSha256': sha(pool / 'InRelease'), 'maximumRequests': 4, 'productionChanged': False}, indent=2) + '\n')
print('Four exact vendor rollback packages authenticated; nothing installed.')

"""Fetch three exact vendor packaging sources from the authenticated snapshot.

Preparation evidence only. A newer package does not automatically preserve our
earlier backports; inspect its native source patches before candidate approval.
"""
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
OUT = ROOT / 'successor-sources'
OUT.mkdir(mode=0o700, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
index = ROOT / 'openssl-source/Sources.xz'
assert sha(index.read_bytes()) == 'b449439c113900c8607c1005f7a1ec0704d0f3b7376ba312b2150c79e4e4e06c'
verified = OUT / 'verified-release'
assert not verified.exists(), 'Keep the recorded acquisition'
release = ROOT / 'debian-acquisition/trixie/InRelease'
subprocess.run(['sqv', '--keyring', '/usr/share/keyrings/debian-archive-keyring.pgp', '--cleartext',
                '--output', str(verified), str(release)], check=True, capture_output=True, timeout=30)
entry = next(l.strip().split() for l in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/source/Sources.xz'))
assert sha(index.read_bytes()) == entry[0] and index.stat().st_size == int(entry[1])
wanted = {'mongo-c-driver': '1.30.4-1+deb13u5', 'libmongocrypt': '1.13.2-1+deb13u2', 'sudo': '1.9.16p2-3+deb13u5'}
proofs = []
for stanza in lzma.decompress(index.read_bytes()).decode().split('\n\n'):
    fields = dict(l.split(': ', 1) for l in stanza.splitlines() if ': ' in l and not l.startswith(' '))
    name = fields.get('Package')
    if name not in wanted or fields.get('Version') != wanted[name]:
        continue
    assert fields['Directory'].startswith('pool/main/') and '..' not in fields['Directory'].split('/')
    files = []
    for line in stanza.split('Checksums-Sha256:\n')[1].splitlines():
        if not line.startswith(' '):
            break
        digest, size, filename = line.split()
        assert '/' not in filename
        if not filename.endswith(('.debian.tar.xz', '.dsc')):
            continue
        assert int(size) < 2 * 1024**2
        url = 'https://deb.debian.org/debian/' + fields['Directory'] + '/' + filename
        dest = OUT / filename
        if not dest.exists():
            with urllib.request.urlopen(url, timeout=30) as response:
                assert response.url.startswith('https://deb.debian.org/')
                blob = response.read(2 * 1024**2 + 1)
                assert len(blob) == int(size) and sha(blob) == digest
            dest.write_bytes(blob)
        assert dest.stat().st_size == int(size) and sha(dest.read_bytes()) == digest
        files.append({'file': filename, 'sha256': digest, 'bytes': int(size), 'url': url})
    assert len(files) == 2
    proofs.append({'source': name, 'version': wanted[name], 'files': files})
assert {p['source'] for p in proofs} == set(wanted)
(OUT / 'acquired.json').write_text(json.dumps({'sourceIndexSha256': sha(index.read_bytes()),
    'releaseSha256': sha(release.read_bytes()), 'sources': proofs, 'productionChanged': False,
    'limitation': 'Authenticated packaging source only; not candidate compatibility or release approval.'}, indent=2) + '\n')
print('Three vendor packaging sources authenticated; no build or installation')

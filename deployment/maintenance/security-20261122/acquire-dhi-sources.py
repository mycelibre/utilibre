"""Authenticate the selected DHI packaging sources; no build or activation."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.request

os.umask(0o077)
assert sys.argv[1:] == ['--download']
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'dhi-successors/source'
OUT.mkdir(mode=0o700, exist_ok=True)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
release = ROOT / 'dhi-successors/debian-acquisition/verified-release'
receipt = json.loads((ROOT / 'dhi-index/review.json').read_text())
assert sha(ROOT / 'dhi-index/InRelease') == receipt['releaseSha256']
assert release.read_bytes() == (ROOT / 'dhi-index/verified-release').read_bytes()
entry = next(l.split() for l in release.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/source/Sources.gz'))


def download(url, file, digest, size, limit):
    assert size <= limit
    if not file.exists():
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://dhi.io/')
            blob = response.read(limit + 1)
        assert len(blob) == size and hashlib.sha256(blob).hexdigest() == digest
        file.write_bytes(blob)
    assert file.stat().st_size == size and sha(file) == digest


index = OUT / 'Sources.gz'
download('https://dhi.io/deb/debian/main/dists/trixie/main/source/Sources.gz',
         index, entry[0], int(entry[1]), 2 * 1024**2)
wanted = {'openssl': '3.5.9-1~deb13u1+dhi0',
          'freetype': '2.13.3+dfsg-1+deb13u1+dhi1',
          'nghttp2': '1.64.0-1.1+deb13u2+dhi0'}
proofs = []
for stanza in gzip.decompress(index.read_bytes()).decode().split('\n\n'):
    fields = dict(l.split(': ', 1) for l in stanza.splitlines() if ': ' in l and not l.startswith(' '))
    name = fields.get('Package')
    if name not in wanted or fields.get('Version') != wanted[name]:
        continue
    directory = fields['Directory']
    assert directory.startswith('pool/') and '..' not in directory.split('/')
    files = []
    for line in stanza.split('Checksums-Sha256:\n')[1].splitlines():
        if not line.startswith(' '):
            break
        digest, size, filename = line.split()
        assert '/' not in filename
        if not filename.endswith(('.debian.tar.xz', '.dsc')):
            continue
        url = 'https://dhi.io/deb/debian/main/' + directory + '/' + filename
        download(url, OUT / filename, digest, int(size), 2 * 1024**2)
        files.append({'file': filename, 'sha256': digest, 'bytes': int(size), 'url': url})
    assert len(files) == 2
    proofs.append({'source': name, 'version': wanted[name], 'files': files})
assert {p['source'] for p in proofs} == set(wanted) and len(proofs) == 3
target = OUT / 'acquired.json'
assert not target.exists()
target.write_text(json.dumps({'sourceIndexSha256': sha(index), 'sources': proofs,
    'productionChanged': False, 'maximumRequests': 7,
    'limitation': 'Authenticated source, not compatibility or release approval.'}, indent=2) + '\n')
print('Three exact DHI packaging sources authenticated.')

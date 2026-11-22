"""Acquire one authenticated X.Org source and its build-only protocol headers.

Finite downloads only. Reuses this batch's signed Debian indexes; no APT
resolution, host installation, service operation or advisory mutation.
"""
import hashlib
import json
import lzma
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

assert sys.argv[1:] == ['--download']
os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'fontenc/source'
OUT.mkdir(parents=True, mode=0o700, exist_ok=True)
assert not (OUT / 'authenticated.json').exists(), 'Preserve completed acquisition'
INDEX = ROOT / 'host-successors/trixie'
sha = lambda b: hashlib.sha256(b).hexdigest()
key = Path('/usr/share/keyrings/debian-archive-keyring.pgp')
verified = OUT / 'verified-release'
assert not verified.exists()
subprocess.run(['sqv', '--keyring', str(key), '--cleartext', '--output',
                str(verified), str(INDEX / 'InRelease')],
               check=True, capture_output=True, timeout=30)
hashes = {line.split()[2]: (line.split()[0], int(line.split()[1]))
          for line in verified.read_text().split('\nSHA256:\n')[1].splitlines()
          if len(line.split()) == 3 and len(line.split()[0]) == 64}


def fields(block):
    result, name = {}, None
    for line in block.splitlines():
        if line.startswith(' '):
            assert name is not None
            result[name] += '\n' + line.strip()
        elif ':' in line:
            name, value = line.split(':', 1)
            assert name not in result
            result[name] = value.strip()
    return result


def fetch(relative, digest, size):
    assert relative.startswith(('pool/main/libf/libfontenc/', 'pool/main/x/xorgproto/'))
    assert '..' not in relative.split('/') and 0 < size < 16 * 1024**2
    url = 'https://deb.debian.org/debian/' + relative
    file = OUT / Path(relative).name
    if not file.exists():
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://deb.debian.org/debian/')
            blob = response.read(size + 1)
        assert len(blob) == size and sha(blob) == digest
        file.write_bytes(blob)
    assert file.stat().st_size == size and sha(file.read_bytes()) == digest
    return {'file': file.name, 'sha256': digest, 'bytes': size, 'url': url}


records, identities = {}, {}
for kind, section in [('Sources', 'source'), ('Packages', 'binary-amd64')]:
    blob = lzma.decompress((INDEX / (kind + '.xz')).read_bytes())
    assert (sha(blob), len(blob)) == hashes['main/' + section + '/' + kind]
    records[kind] = [fields(b) for b in blob.decode().split('\n\n') if b.strip()]
    identities[kind] = sha(blob)
matches = [r for r in records['Sources'] if r.get('Package') == 'libfontenc' and r.get('Version') == '1:1.1.8-1']
assert len(matches) == 1
source = matches[0]
files = [fetch(source['Directory'] + '/' + name, digest, int(size))
         for digest, size, name in (line.split() for line in source['Checksums-Sha256'].strip().splitlines())]
headers = [r for r in records['Packages'] if r.get('Package') == 'x11proto-dev' and r.get('Version') == '2024.1-1']
assert len(headers) == 1, 'Build headers must match the reviewed exact release'
header = headers[0]
dependency = fetch(header['Filename'], header['SHA256'], int(header['Size']))
patch = ROOT / 'primary/fontenc-fix.patch'
assert sha(patch.read_bytes()) == '6439b171374dc4994a9d7fe1f019e93d226b10e7c1c9258bfe61a28da9da13e8'
(OUT / patch.name).write_bytes(patch.read_bytes())
report = {'source': 'libfontenc', 'version': source['Version'], 'files': files,
          'buildOnlyHeaders': {'name': 'x11proto-dev', 'version': header['Version'], **dependency},
          'patch': {'file': patch.name, 'sha256': sha(patch.read_bytes()),
                    'url': 'https://gitlab.freedesktop.org/xorg/lib/libfontenc/-/commit/5920c6ee144fffff84b62f5b479171f734f15316.patch'},
          'indexes': identities, 'releaseSha256': sha((INDEX / 'InRelease').read_bytes()),
          'keySha256': sha(key.read_bytes()), 'networkRequestsMaximum': 5,
          'productionChanged': False, 'deploymentApproved': False}
(OUT / 'authenticated.json').write_text(json.dumps(report, indent=2) + '\n')
print('Exact libfontenc source, upstream correction and build-only headers authenticated.')

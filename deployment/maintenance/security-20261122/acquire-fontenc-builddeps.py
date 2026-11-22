"""Fetch the finite Debian packaging dependencies from the frozen signed index.

This is an explicit download step, never part of the default audit or build.
It does not install packages on the host or contact an application service.
"""
import hashlib
import json
import lzma
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request


assert sys.argv[1:] == ['--download']
os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'fontenc/builddeps'
assert not OUT.exists(), 'Preserve prior acquisition evidence'
assert shutil.disk_usage(ROOT).free >= 8 * 1024**3
OUT.mkdir(mode=0o700)
INDEX = ROOT / 'host-successors/trixie'
KEY = Path('/usr/share/keyrings/debian-archive-keyring.pgp')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
verified = OUT / 'verified-release'
subprocess.run(['sqv', '--keyring', str(KEY), '--cleartext', '--output',
                str(verified), str(INDEX / 'InRelease')], check=True,
               capture_output=True, timeout=30)
entries = {line.split()[2]: (line.split()[0], int(line.split()[1]))
           for line in verified.read_text().split('\nSHA256:\n')[1].splitlines()
           if len(line.split()) == 3 and len(line.split()[0]) == 64}
raw = lzma.decompress((INDEX / 'Packages.xz').read_bytes())
assert (hashlib.sha256(raw).hexdigest(), len(raw)) == entries['main/binary-amd64/Packages']


def fields(block):
    result = {}
    for line in block.splitlines():
        if line.startswith(' '):
            continue
        if ': ' in line:
            k, v = line.split(': ', 1)
            result[k] = v
    return result


packages = {p['Package']: p for p in
            (fields(block) for block in raw.decode().split('\n\n'))
            if 'Package' in p}
wanted = {
    'libpng16-16t64': '1.6.48-1+deb13u6',
    'libfontenc1': '1:1.1.8-1+b2',
    'libfreetype6': '2.13.3+dfsg-1+deb13u2',
    'xorg-sgml-doctools': '1:1.11-1.1',
    'lsb-base': '11.6',
    'x11-common': '1:7.7+24+deb13u1',
    'xfonts-encodings': '1:1.0.4-2.2',
    'xfonts-utils': '1:7.7+7',
    'x11proto-dev': '2024.1-1',
    'xutils-dev': '1:7.7+7',
}
assert set(wanted) <= set(packages)
records = []
for name, version in wanted.items():
    row = packages[name]
    assert row['Version'] == version
    path = row['Filename']
    assert path.startswith('pool/main/') and '..' not in path.split('/')
    size, digest = int(row['Size']), row['SHA256']
    assert 0 < size < 2 * 1024**2 and len(digest) == 64
    file = OUT / Path(path).name
    existing = ROOT / 'fontenc/source' / file.name
    if existing.exists() and sha(existing) == digest:
        file.write_bytes(existing.read_bytes())
    else:
        url = 'https://deb.debian.org/debian/' + path
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://deb.debian.org/debian/')
            blob = response.read(size + 1)
        assert len(blob) == size and hashlib.sha256(blob).hexdigest() == digest
        file.write_bytes(blob)
    assert file.stat().st_size == size and sha(file) == digest
    records.append({'name': name, 'version': version, 'file': file.name,
                    'bytes': size, 'sha256': digest})
(OUT / 'authenticated.json').write_text(json.dumps({
    'schemaVersion': 1, 'releaseSha256': sha(INDEX / 'InRelease'),
    'packageIndexSha256': hashlib.sha256(raw).hexdigest(),
    'packages': records, 'networkRequestsMaximum': len(wanted) - 1,
    'hostInstalled': False, 'productionChanged': False,
}, indent=2) + '\n')
print('Exact signed fontenc build-only packages acquired; host unchanged.')

"""Download five exact packages from the deliberately captured signed DHI index.

No refresh, latest resolution, install, release or automatic finding decisions.
The absent newer DHI libc remains a separate unresolved dependency.
"""
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

os.umask(0o077)
assert sys.argv[1:] == ['--download']
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
index = ROOT / 'dhi-index'
receipt = json.loads((index / 'review.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(index / 'InRelease') == receipt['releaseSha256']
assert sha(index / 'Packages.gz') == receipt['indexSha256']
key = ROOT.parent / 'xserver-followup-20261012/dhi/dhi-deb-main.gpg'
assert sha(key) == '6f3fec0bd867abb05443bf0487f27426815ce2fa5d75e1136021560518ce78f3'
out = ROOT / 'dhi-successors/debian-acquisition'
out.mkdir(parents=True, mode=0o700, exist_ok=True)
verified = out / 'verified-release'
assert not verified.exists()
subprocess.run(['sqv', '--keyring', str(key), '--cleartext', '--output', str(verified),
                str(index / 'InRelease')], check=True, capture_output=True, timeout=30)
entry = next(l.split() for l in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/binary-amd64/Packages.gz'))
assert sha(index / 'Packages.gz') == entry[0] and (index / 'Packages.gz').stat().st_size == int(entry[1])
wanted = {'libssl3t64': '3.5.9-1~deb13u1+dhi0', 'openssl': '3.5.9-1~deb13u1+dhi0',
          'openssl-provider-legacy': '3.5.9-1~deb13u1+dhi0',
          'libfreetype6': '2.13.3+dfsg-1+deb13u1+dhi1', 'libnghttp2-14': '1.64.0-1.1+deb13u2+dhi0'}
packages = {}
for stanza in gzip.decompress((index / 'Packages.gz').read_bytes()).decode().split('\n\n'):
    f = dict(l.split(': ', 1) for l in stanza.splitlines() if ': ' in l and not l.startswith(' '))
    name = f.get('Package')
    if name not in wanted or f.get('Version') != wanted[name]:
        continue
    assert name not in packages and f['Architecture'] == 'amd64'
    filename = f['Filename']
    assert filename.startswith('pool/') and '..' not in filename.split('/')
    url = 'https://dhi.io/deb/debian/main/' + filename
    file = out / Path(filename).name
    assert int(f['Size']) <= 16 * 1024**2
    if not file.exists():
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://dhi.io/')
            data = response.read(16 * 1024**2 + 1)
            assert len(data) == int(f['Size']) and hashlib.sha256(data).hexdigest() == f['SHA256']
        file.write_bytes(data)
    assert sha(file) == f['SHA256'] and file.stat().st_size == int(f['Size'])
    packages['dhi/' + name] = {'name': name, 'version': f['Version'], 'file': file.name,
        'sha256': f['SHA256'], 'url': url, 'distribution': 'dhi-trixie',
        'depends': f.get('Depends', ''), 'preDepends': f.get('Pre-Depends', ''), 'source': f.get('Source', name)}
assert len(packages) == 5
result = out / 'authenticated.json'
assert not result.exists()
result.write_text(json.dumps({'packages': packages, 'releaseSha256': sha(index / 'InRelease'),
    'indexSha256': sha(index / 'Packages.gz'), 'keySha256': sha(key), 'maximumRequests': 5,
    'method': 'Existing signed DHI index, exact versions and SHA256 payloads',
    'productionChanged': False, 'releaseApproved': False}, indent=2) + '\n')
print('Five exact signed DHI packages acquired; compatibility and release remain unapproved.')

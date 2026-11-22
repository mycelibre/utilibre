"""Explicit signed OpenSSL successor acquisition; no install or activation.

Only three exact native packages, Debian indexes and their packaging source.
The existing DTLS fix must be verified separately before any release approval.
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
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/bookworm-successor')
ROOT.mkdir(mode=0o700, exist_ok=True)
original = HERE / 'acquire-debian.py'
code = original.read_text()
for old, new in [
    ('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')'),
    ("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')'),
    ("'debian-wanted.json'", "'bookworm-successor-wanted.json'"),
]:
    assert code.count(old) >= 1
    code = code.replace(old, new)
adapter = ROOT / 'acquire-adapter.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
source = ROOT / 'source'
source.mkdir(mode=0o700, exist_ok=True)
auth = json.loads((ROOT / 'debian-acquisition/authenticated.json').read_text())
distributions = {p['distribution'] for p in auth['packages'].values()}
assert len(distributions) == 1
dist = distributions.pop()
assert dist in ('bookworm', 'bookworm-security', 'bookworm-updates')
base = 'https://deb.debian.org/' + ('debian-security' if dist == 'bookworm-security' else 'debian')
release = ROOT / 'debian-acquisition' / dist / 'InRelease'
verified = source / 'verified-release'
assert not verified.exists(), 'Preserve authenticated source evidence'
subprocess.run(['sqv', '--keyring', '/usr/share/keyrings/debian-archive-keyring.pgp', '--cleartext',
                '--output', str(verified), str(release)], check=True, capture_output=True, timeout=30)


def fetch(url, path, limit):
    assert url.startswith('https://deb.debian.org/')
    if path.exists():
        assert path.stat().st_size <= limit
        return path.read_bytes()
    with urllib.request.urlopen(url, timeout=30) as response:
        assert response.url.startswith('https://deb.debian.org/')
        data = response.read(limit + 1)
        assert len(data) <= limit
    path.write_bytes(data)
    return data


entry = next(l.strip().split() for l in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/source/Sources.xz'))
index = fetch(base + '/dists/' + dist + '/main/source/Sources.xz', source / 'Sources.xz', 32 * 1024**2)
assert len(index) == int(entry[1]) and hashlib.sha256(index).hexdigest() == entry[0]
matches = []
for stanza in lzma.decompress(index).decode().split('\n\n'):
    fields = dict(l.split(': ', 1) for l in stanza.splitlines() if ': ' in l and not l.startswith(' '))
    if fields.get('Package') == 'openssl' and fields.get('Version') == '3.0.22-1~deb12u2':
        matches.append((stanza, fields))
assert len(matches) == 1
stanza, fields = matches[0]
assert fields['Directory'].startswith('pool/') and '..' not in fields['Directory'].split('/')
files = []
for line in stanza.split('Checksums-Sha256:\n')[1].splitlines():
    if not line.startswith(' '):
        break
    digest, size, name = line.split()
    assert '/' not in name
    # Native source archive was already authenticated in October. Packaging is
    # sufficient to compare the retained fix; no rebuild is implicitly started.
    if not name.endswith(('.debian.tar.xz', '.dsc')):
        continue
    url = base + '/' + fields['Directory'] + '/' + name
    data = fetch(url, source / name, 4 * 1024**2)
    assert len(data) == int(size) and hashlib.sha256(data).hexdigest() == digest
    files.append({'file': name, 'sha256': digest, 'bytes': int(size), 'url': url})
assert len(files) == 2
(source / 'acquired.json').write_text(json.dumps({'releaseSha256': sha(release),
    'sourceIndexSha256': sha(source / 'Sources.xz'), 'version': fields['Version'],
    'files': files, 'productionChanged': False, 'candidateApproved': False}, indent=2) + '\n')
print('Three exact vendor packages and signed packaging source acquired; not approved or deployed.')

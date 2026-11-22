"""Explicit bounded acquisition of one native source and upstream corrections.

Reuses the already authenticated Debian snapshot. Never resolves latest,
installs packages, runs a build, or activates a service.
"""
import datetime
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
out = ROOT / 'openssl-source'
out.mkdir(exist_ok=True)
key = Path('/usr/share/keyrings/debian-archive-keyring.pgp')
release = ROOT / 'debian-acquisition/trixie/InRelease'
sha = lambda data: hashlib.sha256(data).hexdigest()
verified = out / 'verified-release-recheck'
assert not verified.exists(), 'Preserve the authenticated source-acquisition evidence'
subprocess.run(['sqv', '--keyring', str(key), '--cleartext', '--output', str(verified), str(release)],
               check=True, capture_output=True, timeout=30)


def fetch(url, file, limit):
    if file.exists():
        return file.read_bytes()
    with urllib.request.urlopen(url, timeout=30) as response:
        assert response.url.startswith(('https://deb.debian.org/',
                                        'https://github.com/openssl/openssl/',
                                        'https://patch-diff.githubusercontent.com/'))
        data = response.read(limit + 1)
        assert len(data) <= limit
    file.write_bytes(data)
    return data


entry = next(line.strip().split() for line in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if line.strip().endswith(' main/source/Sources.xz'))
index = fetch('https://deb.debian.org/debian/dists/trixie/main/source/Sources.xz',
              out / 'Sources.xz', 32 * 1024**2)
assert len(index) == int(entry[1]) and sha(index) == entry[0]
matches = []
for stanza in lzma.decompress(index).decode().split('\n\n'):
    fields = dict(line.split(': ', 1) for line in stanza.splitlines()
                  if ': ' in line and not line.startswith(' '))
    if fields.get('Package') == 'openssl' and fields.get('Version') == '3.5.9-1~deb13u1':
        matches.append((stanza, fields))
assert len(matches) == 1, 'Missing or ambiguous exact source version'
stanza, fields = matches[0]
(out / 'source-index.txt').write_text(stanza + '\n')
files = []
for line in stanza.split('Checksums-Sha256:\n')[1].splitlines():
    if not line.startswith(' '):
        break
    digest, size, name = line.split()
    assert '/' not in name and fields['Directory'] == 'pool/main/o/openssl'
    url = 'https://deb.debian.org/debian/' + fields['Directory'] + '/' + name
    data = fetch(url, out / name, 64 * 1024**2)
    assert len(data) == int(size) and sha(data) == digest
    files.append({'file': name, 'sha256': digest, 'size': int(size), 'url': url})

# Each immutable commit is linked by the official 3.5 vulnerability page.
# Acquisition alone is neither patch compatibility nor release approval.
commits = {
    'CVE-2026-107493': 'c8f6d04f8e6d40b1bf83334e4a2ec9daf5943a3d',
    'CVE-2026-124709': 'f3acb0a3328046741479482c51cec815839e1b05',
    'CVE-2026-35190': '9491b0d9cc7950af1f3dc89499bd5433b9cd4f43',
    'CVE-2026-88823': '159e1de0c448d7b9f09ad768c8e141def4aa1eb4',
    'CVE-2026-107496': 'a0051cfe699bf5a047bc1c4faef65f80f7987366',
    'CVE-2026-88822': '1a73dc590cbad62d6f0329ea4779eadaa8d8fd75',
    'CVE-2026-95691': 'f6244675833e097c2429a40d1b206d95385bd42f',
    'CVE-2026-95692': '257a3427aa0ef8d9dd2ef5b3e2d1c021a221b116',
}
patches = []
for advisory, commit in commits.items():
    url = 'https://github.com/openssl/openssl/commit/' + commit + '.patch'
    file = out / (advisory + '.patch')
    data = fetch(url, file, 1024**2)
    assert data.startswith(('From ' + commit + ' ').encode()) and advisory.encode() in data
    patches.append({'advisory': advisory, 'commit': commit, 'sha256': sha(data), 'file': file.name, 'url': url})
    print(advisory, len(data), flush=True)
receipt = out / 'acquired.json'
assert not receipt.exists()
receipt.write_text(json.dumps({
    'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'sourceVersion': fields['Version'], 'keySha256': sha(key.read_bytes()),
    'releaseSha256': sha(release.read_bytes()), 'indexSha256': sha(index),
    'files': files, 'patches': patches, 'deployed': False,
    'reference': 'https://openssl-library.org/news/vulnerabilities-3.5/',
}, indent=2) + '\n')

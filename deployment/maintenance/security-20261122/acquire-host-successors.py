"""Authenticate already-installed sudo/QEMU successors; no installation.

Preserves the cached signed Debian indexes and downloads eight finite artifacts
from the official archive. This is a new provenance review, not a source update.
"""
import hashlib
import json
import lzma
import os
from pathlib import Path
import subprocess
import urllib.request

os.umask(0o077)
OUT = Path('/var/lib/utilibre-maintenance/security-20261122/host-successors')
OUT.mkdir(mode=0o700, exist_ok=True)
sha = lambda b: hashlib.sha256(b).hexdigest()
key = Path('/usr/share/keyrings/debian-archive-keyring.pgp')
targets = {'trixie': ('sudo', '1.9.16p2-3+deb13u5', ['sudo']),
           'trixie-backports': ('qemu', '1:11.1.3+ds-1~bpo13+1', ['qemu-utils', 'qemu-guest-agent'])}
report = {'indexes': [], 'sources': [], 'packages': [], 'networkRequestsMaximum': 8, 'productionChanged': False}


def fields(block):
    result, name = {}, None
    for line in block.splitlines():
        if line.startswith(' '):
            result[name] += '\n' + line.strip()
        elif ': ' in line:
            name, value = line.split(': ', 1)
            assert name not in result
            result[name] = value
        elif line.endswith(':'):
            name = line[:-1]
            assert name not in result
            result[name] = ''
    return result


def download(relative, digest, size):
    assert relative.startswith(('pool/main/s/sudo/', 'pool/main/q/qemu/')) and '..' not in relative.split('/')
    assert 0 < size < 64 * 1024**2
    file = OUT / Path(relative).name
    url = 'https://deb.debian.org/debian/' + relative
    if not file.exists():
        with urllib.request.urlopen(url, timeout=40) as response:
            assert response.url.startswith('https://deb.debian.org/debian/')
            blob = response.read(size + 1)
        assert len(blob) == size and sha(blob) == digest
        file.write_bytes(blob)
    assert file.stat().st_size == size and sha(file.read_bytes()) == digest
    return {'file': file.name, 'sha256': digest, 'size': size, 'url': url}


for suite, (source, version, packages) in targets.items():
    prefix = Path('/var/lib/apt/lists') / ('_etc_apt_mirrors_debian.list_dists_' + suite)
    directory = OUT / suite
    directory.mkdir(mode=0o700, exist_ok=True)
    release = directory / 'InRelease'
    if not release.exists():
        release.write_bytes(Path(str(prefix) + '_InRelease').read_bytes())
    verified = directory / 'verified-release'
    if not verified.exists():
        subprocess.run(['sqv', '--keyring', str(key), '--cleartext', '--output', str(verified), str(release)],
                       capture_output=True, check=True, timeout=30)
    hashes = {line.split()[2]: (line.split()[0], int(line.split()[1]))
              for line in verified.read_text().split('\nSHA256:\n')[1].splitlines()
              if len(line.split()) == 3 and len(line.split()[0]) == 64}
    for section, indexname in [('source', 'Sources'), ('binary-amd64', 'Packages')]:
        archive = directory / (indexname + '.xz')
        if archive.exists():
            blob = lzma.decompress(archive.read_bytes())
        else:
            blob = Path(str(prefix) + '_main_' + section + '_' + indexname).read_bytes()
            assert len(blob) < 180 * 1024**2
            assert (sha(blob), len(blob)) == hashes['main/' + section + '/' + indexname]
            archive.write_bytes(lzma.compress(blob, preset=1))
        assert (sha(blob), len(blob)) == hashes['main/' + section + '/' + indexname]
        records = [fields(b) for b in blob.decode().split('\n\n') if b.strip()]
        if section == 'source':
            matches = [r for r in records if r.get('Package') == source and r.get('Version') == version]
            assert len(matches) == 1
            row = matches[0]
            files = []
            for line in row['Checksums-Sha256'].strip().splitlines():
                digest, size, filename = line.split()
                if filename.endswith(('.dsc', '.debian.tar.xz')) or source == 'qemu' and filename.endswith('.orig.tar.xz'):
                    files.append(download(row['Directory'] + '/' + filename, digest, int(size)))
            report['sources'].append({'name': source, 'version': version, 'files': files, 'indexSha256': sha(blob)})
        else:
            for name in packages:
                matches = [r for r in records if r.get('Package') == name and r.get('Version') == version]
                assert len(matches) == 1
                row = matches[0]
                proof = download(row['Filename'], row['SHA256'], int(row['Size']))
                installed = subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', name], text=True, timeout=15)
                assert installed == version
                report['packages'].append({**proof, 'name': name, 'version': version, 'indexSha256': sha(blob)})
        report['indexes'].append({'suite': suite, 'kind': indexname, 'sha256': sha(blob),
            'archiveSha256': sha(archive.read_bytes()), 'releaseSha256': sha(release.read_bytes()), 'keySha256': sha(key.read_bytes())})
assert len(report['packages']) == 3 and len(report['sources']) == 2
# Five source artifacts plus three binaries; never resolves another version.
report['networkRequestsMaximum'] = 8
target = OUT / 'authenticated.json'
assert not target.exists()
target.write_text(json.dumps(report, indent=2) + '\n')
print('Exact installed sudo/QEMU binaries and corresponding vendor sources authenticated; nothing installed.')

"""Finite native source offer using the existing public source mounts.

Preparation does not publish. Publication never restarts services or replaces
older offers. No live configuration, build logs, credentials or user data.
"""
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile

os.umask(0o077)
assert sys.argv[1:] in (['prepare'], ['publish'])
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
build = ROOT / 'openssl-build-v2'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
proof = json.loads((build / 'built.json').read_text())
assert proof['passed'] and proof['network'] == 'none' and not proof['deployed']
name = 'security-openssl-20261122-source.tar.gz'
archive = ROOT / name
receipt_file = ROOT / 'openssl-source-offer.json'
entries = {}


def add(path, name, digest=None):
    path = Path(path)
    assert path.is_file() and not path.is_symlink() and path.stat().st_size < 80 * 1024**2
    assert name not in entries and not Path(name).is_absolute() and '..' not in Path(name).parts
    if digest:
        assert sha(path) == digest
    entries[name] = {'path': path, 'sha256': sha(path)}


for filename, digest in proof['artifacts'].items():
    if filename.endswith(('.dsc', '.tar.xz', '.tar.gz', '.buildinfo')) or filename == 'build-packages.lock':
        add(build / filename, 'native/' + filename, digest)
assert any(n.endswith('.orig.tar.gz') for n in entries)
assert any(n.endswith('.debian.tar.xz') for n in entries)
assert any(n.endswith('.dsc') for n in entries)
for filename in ('openssl-inputs.json', 'openssl-inner.py', 'prepare-openssl.py', 'acquire-openssl.py', 'publish-openssl.py'):
    add(HERE / filename, 'integration/' + filename)
add(HERE / 'openssl-build.txt', 'BUILD.txt')
for patch in json.loads((HERE / 'openssl-inputs.json').read_text())['patches']:
    add(ROOT / 'openssl-source' / patch['file'], 'patches/' + patch['file'], patch['sha256'])
add(HERE.parents[2] / 'LICENSE', 'integration/LICENSE')
manifest = {'schemaVersion': 1, 'sourceVersion': proof['sourceVersion'],
            'candidateVersion': proof['candidateVersion'], 'sourceBuildSha256': sha(build / 'built.json'),
            'licenses': {'OpenSSL': 'Apache-2.0; original notices in upstream source',
                         'Debian packaging': 'See debian/copyright in the Debian source archive',
                         'Utilibre integration': 'AGPL-3.0-or-later'},
            'files': {n: d['sha256'] for n, d in sorted(entries.items())}}
if sys.argv[1] == 'prepare':
    assert not archive.exists() and not receipt_file.exists(), 'Preserve existing source offer'
    assert shutil.disk_usage(ROOT).free > 8 * 1024**3 + 100 * 1024**2
    with tarfile.open(archive, 'w:gz', compresslevel=3) as tar:
        for n, d in sorted(entries.items()):
            info = tar.gettarinfo(str(d['path']), arcname=n)
            info.uid = info.gid = 0
            info.uname = info.gname = ''
            info.mode, info.mtime = 0o644, 1795305600
            with d['path'].open('rb') as f:
                tar.addfile(info, f)
        data = (json.dumps(manifest, indent=2) + '\n').encode()
        info = tarfile.TarInfo('SOURCE-MANIFEST.json')
        info.size, info.mode, info.mtime = len(data), 0o644, 1795305600
        tar.addfile(info, io.BytesIO(data))
    with tarfile.open(archive) as tar:
        assert set(tar.getnames()) == set(entries) | {'SOURCE-MANIFEST.json'}
        for n, d in entries.items():
            assert hashlib.sha256(tar.extractfile(n).read()).hexdigest() == d['sha256']
    receipt = {'passed': True, 'file': name, 'sha256': sha(archive), 'bytes': archive.stat().st_size,
               'sourceBuildSha256': manifest['sourceBuildSha256'], 'manifest': manifest,
               'published': False, 'destinations': ['/opt/utilibre/toolbox-public', '/opt/utilibre/records/public']}
else:
    receipt = json.loads(receipt_file.read_text())
    assert receipt['passed'] and receipt['manifest'] == manifest and receipt['sha256'] == sha(archive)
    for directory in receipt['destinations']:
        target = Path(directory) / name
        assert target.parent.is_dir()
        if target.exists():
            assert sha(target) == receipt['sha256']
        else:
            os.link(archive, target)
    archive.chmod(0o644)
    receipt['published'] = True
receipt_file.write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps({k: v for k, v in receipt.items() if k != 'manifest'}))

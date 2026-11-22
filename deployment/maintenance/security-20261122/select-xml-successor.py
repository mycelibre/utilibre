"""Acquire one exact signed Alpine XML package; select five existing images.

One bounded vendor download, then offline signature verification with the
already-installed Alpine trust store. No installation or deployment approval.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import urllib.request

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'xml-successor'
target = HERE / 'xml-successor-inputs.json'
assert not target.exists()
OUT.mkdir(mode=0o700, exist_ok=True)
original = json.loads((HERE / 'vendor-inputs.json').read_text())
assert shutil.disk_usage(ROOT).free >= original['minimumFreeBytes']
file = OUT / 'libxml2-2.13.9-r3.apk'
url = 'https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/' + file.name
if not file.exists():
    with urllib.request.urlopen(url, timeout=30) as response:
        assert response.url == url
        data = response.read(4 * 1024**2 + 1)
    assert len(data) < 4 * 1024**2
    file.write_bytes(data)
file.chmod(0o644)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
with tarfile.open(file) as tar:
    info = tar.extractfile('.PKGINFO').read().decode()
assert 'pkgname = libxml2\n' in info and 'pkgver = 2.13.9-r3\n' in info and 'arch = x86_64\n' in info
rows = []
for key, image, name, profile in [
    ('wallabag', 'sha256:18d91cfb5a67626dc56d1acd07c9fbdc6f766cd38e3aaf7f52da0f1a817bbb18', 'utilibre-wallabag-app-1', 'php-runtime'),
    ('translite', 'sha256:30040d214d618e7edfb55729dc05a1221adaacc4b5443df9b1580e30ac048de2', 'utilibre-translite-translite-1', 'php-runtime'),
    ('privatebin', 'sha256:f9c49c1da111096408a0d9e6ef7d82bd56f43fe9191e4218b2bc7cfe3cf9cb87', 'utilibre-services-privatebin-1', 'php-runtime'),
    ('records-db', 'sha256:490cadc4822a65b9a7f075fde1662a09eec7619f9e63d5aecbcefe7b1c0fd1bd', 'utilibre-records-db-1', 'postgres-runtime'),
    ('simplelogin-db', 'sha256:54953290e601456e00d0782e3284505933e2b4e70fbffa0bcc54a15b1290193e', 'utilibre-simplelogin-db-1', 'postgres-runtime'),
]:
    scan = json.loads((ROOT.parent / 'security.json').read_text())
    record = next(i for i in scan['images'] if i['id'] == image and i['status'] == 'checked')
    assert name in record['containers']
    refs = []
    for container in record['containers']:
        actual, ref = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.Config.Image}}', container], text=True, timeout=15).split()
        assert actual == image
        refs.append(ref)
    result = subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--cpus', '.5', '--memory', '128m', '--pids-limit', '32',
        '--log-driver', 'none', '--mount', 'type=bind,src=' + str(file) + ',dst=/package.apk,readonly',
        '--entrypoint', 'sh', image, '-ec', 'apk verify /package.apk; cat /etc/alpine-release; apk --no-network info -e "libxml2=2.13.9-r2"'], capture_output=True, timeout=30)
    (OUT / (key + '-signature.log')).write_bytes(result.stdout + result.stderr)
    assert result.returncode == 0 and b'libxml2\n' in result.stdout
    release = next(line for line in result.stdout.decode().splitlines() if line.startswith('3.24.'))
    rows.append({'key': key, 'base': image, 'containers': record['containers'], 'oldRefs': sorted(set(refs)),
        'release': release, 'kind': 'alpine', 'candidate': 'utilibre-xml-' + key + ':20261122',
        'approval': 'preparation-only', 'packages': {'libxml2': '2.13.9-r2'}, 'consumerProfile': profile,
        'signatureEvidenceSha256': sha(OUT / (key + '-signature.log'))})
manifest = {k: original[k] for k in ('schemaVersion', 'minimumFreeBytes', 'exporterSha256', 'database')}
manifest.update(rows=rows, fixtures={}, packages={'libxml2': {'file': file.name, 'version': '2.13.9-r3', 'url': url, 'sha256': sha(file), 'size': file.stat().st_size}},
    upstream='https://pkgs.alpinelinux.org/packages?arch=x86_64&branch=v3.24&name=libxml2',
    acquisition={'requestsMaximum': 1, 'signatureCheckedOfflineInEachExactBaseline': True})
target.write_text(json.dumps(manifest, indent=2) + '\n')
print('One signed XML archive and five exact baseline images selected; no installation.')

"""Two finite follow-ups: signed Authentik HTTP/2 library and Gathio headers.

One bounded Debian archive request; all indexes and other inputs already exist.
No installation, source rewriting, live service requests or approval.
"""
import hashlib
import json
import lzma
import os
from pathlib import Path
import shutil
import subprocess
import urllib.request

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/remaining-vendor')
ROOT.mkdir(mode=0o700, exist_ok=True)
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
target = HERE / 'remaining-vendor-inputs.json'
assert not target.exists()
pool = ROOT / 'debian-acquisition'
pool.mkdir(mode=0o700, exist_ok=True)
original = ROOT.parent / 'debian-acquisition/bookworm-security'
verified = pool / 'verified-release'
subprocess.run(['sqv', '--keyring', '/usr/share/keyrings/debian-archive-keyring.pgp', '--cleartext',
    '--output', str(verified), str(original / 'InRelease')], check=True, capture_output=True, timeout=30)
entry = next(l.split() for l in verified.read_text().split('\nSHA256:\n')[1].splitlines()
             if l.strip().endswith(' main/binary-amd64/Packages.xz'))
index = original / 'Packages.xz'
assert sha(index) == entry[0] and index.stat().st_size == int(entry[1])
matches = []
for block in lzma.decompress(index.read_bytes()).decode().split('\n\n'):
    f = dict(l.split(': ', 1) for l in block.splitlines() if ': ' in l and not l.startswith(' '))
    if f.get('Package') == 'linux-libc-dev' and f.get('Version') == '6.1.192-2':
        matches.append(f)
assert len(matches) == 1
f = matches[0]
assert f['Filename'].startswith('pool/updates/main/l/linux/') and '..' not in f['Filename']
file = pool / Path(f['Filename']).name
url = 'https://deb.debian.org/debian-security/' + f['Filename']
if not file.exists():
    with urllib.request.urlopen(url, timeout=30) as response:
        assert response.url.startswith('https://deb.debian.org/')
        blob = response.read(4 * 1024**2)
    assert len(blob) == int(f['Size']) and hashlib.sha256(blob).hexdigest() == f['SHA256']
    file.write_bytes(blob)
assert sha(file) == f['SHA256']
leaf = read(HERE / 'debian-leaf-inputs.json')
pin = leaf['packages']['trixie/libnghttp2-14']
source = ROOT.parent / 'leaves/debian-acquisition' / pin['file']
assert sha(source) == pin['sha256']
shutil.copyfile(source, pool / pin['file'])
packages = {'trixie/libnghttp2-14': pin, 'bookworm/linux-libc-dev': {
    'name': f['Package'], 'version': f['Version'], 'file': file.name, 'sha256': f['SHA256'],
    'url': url, 'distribution': 'bookworm-security', 'depends': f.get('Depends', ''), 'preDepends': f.get('Pre-Depends', ''),
    'indexSha256': sha(index), 'releaseSha256': sha(original / 'InRelease')}}
scan = read(ROOT.parents[1] / 'security.json')
assert scan['status'] == 'checked' and shutil.disk_usage(ROOT).free >= leaf['minimumFreeBytes']
rows = []
for key, expected, names, selected in [
    ('identity-server', 'sha256:de6429a7bda14350c058824ed237b9328198bee30bd8146ac7f1db00e9fd6166',
     ['utilibre-identity-server-1', 'utilibre-identity-worker-1'], {'libnghttp2-14': {'installed': '1.64.0-1.1+deb13u1', 'package': 'trixie/libnghttp2-14'}}),
    ('gathio-postgres', 'sha256:4b8a58c82f8c3c21c03044d14ad5e1814425a240564d9d66b9631fddfef56433',
     ['utilibre-gathio-postgres-1'], {'linux-libc-dev': {'installed': '6.1.190-1', 'package': 'bookworm/linux-libc-dev'}}),
]:
    refs = []
    for name in names:
        image, ref = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.Config.Image}}', name], text=True, timeout=20).split()
        assert image == expected
        refs.append(ref)
    assert any(i['status'] == 'checked' and i['id'] == expected and set(i['containers']) == set(names) for i in scan['images'])
    rows.append({'key': key, 'base': expected, 'containers': names, 'oldRefs': sorted(set(refs)),
        'kind': 'debian', 'suite': 'bookworm' if key == 'gathio-postgres' else 'trixie', 'packages': selected,
        'loadLibraries': ['/usr/lib/x86_64-linux-gnu/libnghttp2.so.14'] if key == 'identity-server' else [],
        'candidate': 'utilibre-remaining-' + key + ':20261122', 'approval': 'preparation-only'})
(ROOT / 'before').mkdir()
shutil.copyfile(ROOT.parents[1] / 'security.json', ROOT / 'before/security.json')
(ROOT / 'scan-cache').symlink_to(ROOT.parent / 'scan-cache', target_is_directory=True)
(ROOT / 'scanner-inputs.json').write_text(json.dumps(leaf['database'], indent=2) + '\n')
(ROOT / 'fixtures').mkdir(mode=0o700)
shutil.copyfile(ROOT.parent / 'leaves/fixtures/curl', ROOT / 'fixtures/curl')
(ROOT / 'fixtures/curl').chmod(0o755)
manifest = {k: leaf[k] for k in ('schemaVersion', 'minimumFreeBytes', 'database', 'exporterSha256')}
manifest.update(packages=packages, rows=rows, http2Fixture={**leaf['http2Fixture'], 'selectedKeys': ['identity-server']})
manifest['headerCompiler'] = read(HERE / 'openssl-inputs.json')['compiler']
target.write_text(json.dumps(manifest, indent=2) + '\n')
print('Two exact inputs selected; no build or activation. One bounded signed-package download.')

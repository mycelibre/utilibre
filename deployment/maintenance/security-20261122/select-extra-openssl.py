"""Two additional ordinary consumers of the exact already-built OpenSSL repair.

No resolution, downloads, builds or approval. The earlier sixteen-row manifest
and all its completed evidence remain unchanged.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'openssl-extra-runtime'
manifest = HERE / 'openssl-extra-runtime-inputs.json'
assert not OUT.exists() and not manifest.exists()
previous = json.loads((HERE / 'openssl-runtime-inputs.json').read_text())
assert shutil.disk_usage(ROOT).free >= previous['minimumFreeBytes']
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(ROOT / 'openssl-build-v2/built.json') == previous['sourceBuildSha256']
scan = json.loads((ROOT.parent / 'security.json').read_text())
rows = []
for key, image, names in [
    ('kitchenowl-app', 'sha256:106c5a140dc7217cf714c4e7f850ff17fedf79ef106d5ea9f64adf365ff72760', ['libssl3t64', 'openssl', 'openssl-provider-legacy']),
    ('linkding-linkding', 'sha256:a600d501f4a3ac63d74e16082d1c5a1d9aa1c53fbb6a7ea396bfdc68c0d0fa4c', ['libssl3t64', 'openssl', 'openssl-provider-legacy', 'libssl-dev']),
]:
    name = 'utilibre-' + key + '-1'
    image_id, ref = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.Config.Image}}', name], text=True, timeout=15).split()
    assert image_id == image
    assert any(i['id'] == image and i['status'] == 'checked' and i['containers'] == [name] for i in scan['images'])
    versions = subprocess.check_output(['docker', 'exec', name, 'dpkg-query', '-W', '-f=${Package}=${Version}\n', *names], text=True, timeout=15)
    assert dict(line.split('=', 1) for line in versions.splitlines()) == dict.fromkeys(names, '3.5.7-1~deb13u3')
    rows.append({'key': key, 'base': image, 'containers': [name], 'oldRefs': [ref], 'kind': 'debian', 'suite': 'trixie',
                 'packages': {n: {'installed': '3.5.7-1~deb13u3', 'package': n} for n in names},
                 'loadLibraries': ['/usr/lib/x86_64-linux-gnu/libssl.so.3', '/usr/lib/x86_64-linux-gnu/libcrypto.so.3'],
                 'candidate': 'utilibre-openssl-extra-' + key + ':20261122', 'approval': 'preparation-only', 'releaseApproval': 'not-approved'})
OUT.mkdir(mode=0o700)
for name in ('debian-acquisition', 'fixtures', 'before'):
    (OUT / name).mkdir(mode=0o700)
for pin in previous['packages'].values():
    original = ROOT / 'openssl-build-v2' / pin['file']
    assert sha(original) == pin['sha256']
    os.link(original, OUT / 'debian-acquisition' / pin['file'])
shutil.copyfile(ROOT / 'openssl-runtime/fixtures/openssl', OUT / 'fixtures/openssl')
(OUT / 'fixtures/openssl').chmod(0o755)
assert sha(OUT / 'fixtures/openssl') == previous['nativeFixture']['cliSha256']
shutil.copyfile(ROOT.parent / 'security.json', OUT / 'before/security.json')
shutil.copyfile(ROOT / 'scanner-inputs.json', OUT / 'scanner-inputs.json')
(OUT / 'scan-cache').symlink_to(ROOT / 'scan-cache')
value = {k: previous[k] for k in ('schemaVersion', 'minimumFreeBytes', 'database', 'exporterSha256', 'sourceBuildSha256', 'packages', 'nativeFixture')}
value['rows'] = rows
manifest.write_text(json.dumps(value, indent=2) + '\n')
print('Two exact additional consumers selected; existing source and crypto fixtures reused.')

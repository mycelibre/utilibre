"""Select five existing OpenSSL consumers after the completed SASL release.

No version resolution, candidate build or deployment. The current complete
assessment and retained-source proof must match these exact running inputs.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/bookworm-successor')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
target = HERE / 'bookworm-successor-inputs.json'
assert not target.exists(), 'Preserve selected input evidence'
proof = ROOT / 'source/retained-fix.json'
assert read(proof)['passed'] and sha(proof) == 'dbb25cbafd8fe118673210a672eb3c61fd64f48f2617c69e327c01539976944f'
previous = read(HERE / 'sasl-inputs.json')
release = read(ROOT.parent / 'sasl/vendor-debian/release.json')
assert release['status'] == 'passed' and len(release['groups']) == 4
scan = read(ROOT.parents[1] / 'security.json')
assert scan['status'] == 'checked' and scan['completedAt'] > release['completedAt']
assert shutil.disk_usage(ROOT).free >= previous['minimumFreeBytes']
auth = read(ROOT / 'debian-acquisition/authenticated.json')
assert set(auth['packages']) == {'bookworm/' + n for n in ('openssl', 'libssl3', 'libssl-dev')}
rows = []
for key, container, profile in [
    ('community-rallly', 'utilibre-community-rallly-1', 'node-runtime'),
    ('community-uptime-kuma', 'utilibre-community-uptime-kuma-1', 'node-runtime'),
    ('gathio-postgres', 'utilibre-gathio-postgres-1', 'postgres-runtime'),
    ('community-rssbridge', 'utilibre-community-rssbridge-1', 'php-runtime'),
    ('wishlist-app', 'utilibre-wishlist-app-1', 'node-runtime'),
]:
    image, ref = subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}} {{.Config.Image}}', container], text=True, timeout=20).strip().split()
    assert any(i['status'] == 'checked' and i['id'] == image and i['containers'] == [container] for i in scan['images'])
    if key != 'wishlist-app':
        old = read(ROOT.parent / 'sasl/vendor-debian' / key / 'build.json')
        assert old['imageId'] == image
    names = ['openssl', 'libssl3'] + (['libssl-dev'] if key == 'gathio-postgres' else [])
    packages = {}
    for name in names:
        version = subprocess.check_output(['docker', 'exec', container, 'dpkg-query', '-W', '-f=${Version}', name], text=True, timeout=20).strip()
        assert version == '3.0.22-1~deb12u1+utilibre1'
        packages[name] = {'installed': version, 'package': 'bookworm/' + name}
    rows.append({'key': key, 'containers': [container], 'kind': 'debian', 'suite': 'bookworm',
                 'base': image, 'oldRefs': [ref], 'packages': packages, 'consumerProfile': profile,
                 'candidate': 'utilibre-openssl-bookworm-' + key + ':20261122', 'approval': 'preparation-only'})
before = ROOT / 'before'
before.mkdir()
shutil.copyfile(ROOT.parents[1] / 'security.json', before / 'security.json')
(ROOT / 'scan-cache').symlink_to(ROOT.parent / 'scan-cache', target_is_directory=True)
(ROOT / 'fixtures').mkdir(mode=0o700, exist_ok=True)
(ROOT / 'scanner-inputs.json').write_text(json.dumps(previous['database'], indent=2) + '\n')
cli_hash = subprocess.check_output(['docker', 'exec', 'utilibre-community-uptime-kuma-1',
                                    'sha256sum', '/usr/bin/openssl'], text=True, timeout=20).split()[0]
assert len(cli_hash) == 64 and all(c in '0123456789abcdef' for c in cli_hash)
manifest = {k: previous[k] for k in ('schemaVersion', 'minimumFreeBytes', 'database', 'exporterSha256', 'consumerFixtureSha256', 'gathioPostgresVersion')}
manifest.update(packages=auth['packages'], rows=rows, retainedSourceProofSha256=sha(proof),
    nativeFixture={'cryptoSha256': sha(HERE.parent / 'openssl-bookworm-followup/native-crypto.sh'), 'cliSha256': cli_hash,
                   'tlsServerSha256': sha(HERE.parent / 'closure-followup/curl-fixture-server.py'),
                   'tlsImage': next(r['base'] for r in rows if r['key'] == 'community-uptime-kuma'),
                   'dtlsBinarySha256': 'ffcd361a6d530e009dd916fb5f245d1e3e079c0fbf5f3add97783abdffe142eb',
                   'dtlsCertificateSha256': 'ffdc8d77eb82b815de5235d93d1b733bf7a6934a8276862cd3b0d842b7dcc53d'})
target.write_text(json.dumps(manifest, indent=2) + '\n')
print('Five exact Bookworm OpenSSL inputs selected; no build or activation.')

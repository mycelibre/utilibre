"""Pin the completed native build to the sixteen already verified XZ successors.

Preparation only: no version resolution, candidate build, release approval or
production change. Preserve the completed manifest and scanner inputs.
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
OUT = ROOT / 'openssl-runtime'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
manifest_file = HERE / 'openssl-runtime-inputs.json'
assert not manifest_file.exists()
built = ROOT / 'openssl-build-v2/built.json'
source = read(built)
assert source['passed'] and source['network'] == 'none' and not source['deployed']
assert source['candidateVersion'] == '3.5.9-1~deb13u1+utilibre1'
previous = read(HERE / 'debian-library-inputs.json')
selection = read(OUT / 'selection-baseline.json')
assert len(selection) == 16 and {r['key'] for r in selection} == {r['key'] for r in previous['rows']}
assert shutil.disk_usage(ROOT).free > previous['minimumFreeBytes']
packages, rows = {}, []
acquisition = OUT / 'debian-acquisition'
acquisition.mkdir()
for row in selection:
    release_build = read(ROOT / 'libraries/vendor-debian' / row['key'] / 'build.json')
    assert release_build['passed'] and release_build['imageId'] == row['base']
    for name in row['containers']:
        assert subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}}', name], text=True, timeout=15).strip() == row['base']
    pinned = {}
    for name, old in row['packages'].items():
        assert name in ('libssl3t64', 'openssl', 'openssl-provider-legacy', 'libssl-dev') and old == '3.5.7-1~deb13u3'
        filename = name + '_' + source['candidateVersion'] + '_amd64.deb'
        package = ROOT / 'openssl-build-v2' / filename
        assert sha(package) == source['artifacts'][filename]
        if name not in packages:
            fields = {}
            for field in ('Package', 'Version', 'Depends', 'Pre-Depends'):
                fields[field] = subprocess.check_output(['dpkg-deb', '-f', str(package), field], text=True, timeout=15).strip()
            assert fields['Package'] == name and fields['Version'] == source['candidateVersion']
            packages[name] = {'name': name, 'version': fields['Version'], 'file': filename, 'sha256': sha(package),
                              'distribution': 'trixie', 'depends': fields['Depends'], 'preDepends': fields['Pre-Depends'],
                              'origin': 'Authenticated Debian source plus eight pinned upstream patches; completed offline native build'}
            os.link(package, acquisition / filename)
        pinned[name] = {'installed': old, 'package': name}
    rows.append({**row, 'kind': 'debian', 'suite': 'trixie', 'packages': pinned,
                 'candidate': 'utilibre-openssl-' + row['key'] + ':20261122',
                 'approval': 'preparation-only', 'releaseApproval': 'not-approved'})
fixture_origin = read(OUT / 'fixtures/origin.json')
assert sha(OUT / 'fixtures/openssl') == fixture_origin['sha256']
tls_image = next(r['base'] for r in selection if r['key'] == 'pack-forms-app')
manifest = {'schemaVersion': 1, 'minimumFreeBytes': previous['minimumFreeBytes'],
            'database': previous['database'], 'exporterSha256': previous['exporterSha256'],
            'sourceBuildSha256': sha(built), 'selectionSha256': sha(OUT / 'selection-baseline.json'),
            'packages': packages, 'rows': rows,
            'nativeFixture': {'cliSha256': fixture_origin['sha256'], 'cliOrigin': fixture_origin,
                              'cryptoSha256': sha(HERE.parent / 'openssl-bookworm-followup/native-crypto.sh'),
                              'tlsServerSha256': sha(HERE.parent / 'closure-followup/curl-fixture-server.py'),
                              'tlsImage': tls_image}}
before = OUT / 'before'
before.mkdir()
scan = read(ROOT.parent / 'security.json')
assert scan['status'] == 'checked'
assert all(any(i['id'] == r['base'] and i['status'] == 'checked' for i in scan['images']) for r in rows)
shutil.copyfile(ROOT.parent / 'security.json', before / 'security.json')
shutil.copyfile(ROOT / 'scanner-inputs.json', OUT / 'scanner-inputs.json')
(OUT / 'scan-cache').symlink_to(ROOT / 'scan-cache')
manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
print('Sixteen exact OpenSSL candidates pinned; no build or release performed')

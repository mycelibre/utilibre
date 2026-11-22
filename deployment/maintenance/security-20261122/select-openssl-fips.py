"""Pin the completed vendor-variant build to Authentik's unchanged baseline."""
import copy
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'openssl-fips-runtime'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
built = read(ROOT / 'openssl-fips-build/built.json')
assert built['passed'] and built['network'] == 'none' and not built['deployed']
assert built['candidateVersion'] == '3.5.9-1~deb13u1+utilibre1akfips1'
assert sha(ROOT / 'openssl-fips-build/build.log') == built['artifacts']['build.log']
assert re.search(r'Files=347, Tests=4932, [^\n]*\nResult: PASS', (ROOT / 'openssl-fips-build/build.log').read_text())
inputs = read(HERE / 'openssl-runtime-inputs.json')
row = copy.deepcopy(next(r for r in inputs['rows'] if r['key'] == 'identity-server'))
assert row['releaseApproval'] == 'rejected-incompatible-vendor-variant'
del row['releaseRejectionReason']
row.update(candidate='utilibre-openssl-authentik-fips:20261122', approval='preparation-only', releaseApproval='not-approved')
for name in row['containers']:
    assert subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}}', name], text=True, timeout=15).strip() == row['base']
assert not OUT.exists()
OUT.mkdir(mode=0o700)
for name in ('debian-acquisition', 'fixtures', 'before'):
    (OUT / name).mkdir()
packages = {}
for name in row['packages']:
    filename = name + '_' + built['candidateVersion'] + '_amd64.deb'
    package = ROOT / 'openssl-fips-build' / filename
    assert sha(package) == built['artifacts'][filename]
    fields = {field: subprocess.check_output(['dpkg-deb', '-f', str(package), field], text=True, timeout=15).strip()
              for field in ('Package', 'Version', 'Depends', 'Pre-Depends')}
    assert fields['Package'] == name and fields['Version'] == built['candidateVersion']
    packages[name] = {'name': name, 'version': fields['Version'], 'file': filename, 'sha256': sha(package),
                      'distribution': 'trixie', 'depends': fields['Depends'], 'preDepends': fields['Pre-Depends'],
                      'origin': 'Authenticated Debian source plus eight upstream fixes and retained Authentik build metadata; existing FIPS module is not replaced'}
    os.link(package, OUT / 'debian-acquisition' / filename)
for name in ('openssl', 'origin.json'):
    os.link(ROOT / 'openssl-runtime/fixtures' / name, OUT / 'fixtures' / name)
os.link(ROOT / 'openssl-runtime/before/security.json', OUT / 'before/security.json')
os.link(ROOT / 'scanner-inputs.json', OUT / 'scanner-inputs.json')
(OUT / 'scan-cache').symlink_to(ROOT / 'scan-cache')
inputs.update(rows=[row], packages=packages, sourceBuildSha256=sha(ROOT / 'openssl-fips-build/built.json'))
manifest = HERE / 'openssl-fips-runtime-inputs.json'
assert not manifest.exists()
manifest.write_text(json.dumps(inputs, indent=2) + '\n')
print('Authentik vendor variant pinned; no candidate build or deployment')

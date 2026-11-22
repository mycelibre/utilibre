"""Complete the held Penpot candidate's explicitly selected private library.

The retained regression discovered that LD_LIBRARY_PATH selects the ImageMagick
copy of libcrypto. Update that one exact file as well as the already prepared
system packages. No image-directory wildcards or production mutation.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-penpot-runtime')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
inputs = read(HERE / 'openssl-penpot-runtime-inputs.json')
assert len(inputs['rows']) == 1
row = inputs['rows'][0]
out = ROOT / 'vendor-debian' / row['key']
out.mkdir(parents=True, mode=0o700, exist_ok=True)
assert not (out / 'build.json').exists()
prior = ROOT.parent / 'openssl-runtime/vendor-debian' / row['key']
assert sha(prior / 'build.json') == row['priorBuildSha256']
build = read(prior / 'build.json')
assert build['passed'] and build['base'] == row['base']
assert read(prior / 'scope.json')['passed']
assert row['privateLibrary']['path'] == '/opt/imagick/lib/deps/libcrypto.so.3'
for name in row['containers']:
    assert subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}}', name], text=True, timeout=15).strip() == row['base']
pin = inputs['packages']['libssl3t64']
deb = ROOT / 'debian-acquisition' / pin['file']
assert sha(deb) == pin['sha256']
with tempfile.TemporaryDirectory(prefix='penpot-crypto-', dir=ROOT) as tmp:
    work = Path(tmp)
    subprocess.run(['dpkg-deb', '-x', str(deb), str(work / 'payload')], check=True, timeout=30)
    library = work / 'payload/usr/lib/x86_64-linux-gnu/libcrypto.so.3'
    assert sha(library) == row['privateLibrary']['afterSha256']
    os.link(library, work / 'libcrypto.so.3')
    config = json.loads(subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{json .Config}}', build['imageId']], text=True, timeout=15))
    recipe = 'FROM ' + build['imageId'] + '\nCOPY libcrypto.so.3 /opt/imagick/lib/deps/libcrypto.so.3\n'
    (work / 'Dockerfile').write_text(recipe)
    with (out / 'build.log').open('w') as log:
        subprocess.run(['docker', 'build', '--network', 'none', '--pull=false', '-t', row['candidate'], str(work)],
                       env={**os.environ, 'DOCKER_BUILDKIT': '0'}, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=180)
    image = subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{.Id}}', row['candidate']], text=True, timeout=15).strip()
    assert json.loads(subprocess.check_output(['docker', 'image', 'inspect', '--format', '{{json .Config}}', image], text=True, timeout=15)) == config
proof = {**build, **row, 'imageId': image, 'passed': True, 'deployed': False,
         'systemBuildSha256': row['priorBuildSha256'], 'privateLibrary': row['privateLibrary'],
         'limitation': 'Candidate only. Complete scope, native crypto/TLS/regression/application and frozen scan gates are required separately.'}
(out / 'build.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Penpot private libcrypto candidate prepared; not deployed')

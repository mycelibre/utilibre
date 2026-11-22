"""Reuse the native Mumble protocol fixture, before/after, in isolated state."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/mumble-xml')
OUT = ROOT / 'vendor-debian/mumble-mumble'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
build, scope = [read(OUT / (n + '.json')) for n in ('build', 'scope')]
assert build['passed'] and scope['passed'] and build['imageId'] == scope['imageId']
assert not (OUT / 'application.json').exists()
original = HERE.parent / 'vendor-leaves-final/check-ssl.mjs'
code = original.read_text()
old = "const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',recipe=fileURLToPath(new URL('.',import.meta.url));"
assert code.count(old) == 1
code = code.replace(old, 'const dir=' + json.dumps(str(OUT)) + ',recipe=' + json.dumps(str(original.parent) + '/') + ';')
adapter = OUT / 'native-adapter.mjs'
assert not adapter.exists()
adapter.write_text(code)
stage = {'status': 'passed', 'rows': [{'kind': 'mumble', 'candidate': image, 'candidateId': image}
                                    for image in (build['base'], build['imageId'])]}
(OUT / 'ssl-stage.json').write_text(json.dumps(stage, indent=2) + '\n')
with (OUT / 'application.log').open('wb') as log:
    result = subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter)],
                            stdout=log, stderr=log, timeout=180)
assert result.returncode == 0
native = read(OUT / 'ssl-native.json')
assert native['status'] == 'passed' and len(native['rows']) == 2
assert [r['imageId'] for r in native['rows']] == [build['base'], build['imageId']]
assert all(r['status'] == 'passed' and r['network'] == 'none' for r in native['rows'])
(OUT / 'application.json').write_text(json.dumps({'passed': True, 'date': dt.datetime.now(dt.timezone.utc).isoformat(),
    'base': build['base'], 'imageId': build['imageId'], 'rows': native['rows'],
    'nativeSha256': sha(OUT / 'ssl-native.json'), 'fixtureSha256': sha(original),
    'protocolFixtureSha256': sha(original.parent / 'mumble-native.mjs'), 'adapterSha256': sha(adapter),
    'network': 'isolated container loopback; no external endpoints', 'productionChanged': False,
    'limitation': 'Synthetic TLS/password/voice-loopback compatibility and native XML parser checks; no live voice room, device or per-CVE exploit reproduction.'}, indent=2) + '\n')
print('Mumble old/new: TLS, password denial, guest join and exact synthetic Opus loopback passed.')

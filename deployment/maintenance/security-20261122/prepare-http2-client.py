"""Fixture-only curl dependencies from the already pinned client image.

Authentik ships nghttp2 without curl. This does not add curl to the application.
The tested nghttp2 library and the platform loader/libc must come from each
actual baseline/candidate, never from the fixture bundle.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/remaining-vendor')
inputs = json.loads((HERE / 'remaining-vendor-inputs.json').read_text())
pin = inputs['http2Fixture']
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(ROOT / 'fixtures/curl') == pin['cliSha256']
dest = ROOT / 'fixtures/curl-deps'
dest.mkdir(mode=0o755)
dest.chmod(0o755)  # Public software only; the unprivileged fixture needs traversal.
limits = ['--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--cpus', '.5', '--memory', '128m', '--pids-limit', '32', '--log-driver', 'none', '--user', '65534:65534',
          '-e', 'LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu']


def run(cmd, args):
    return subprocess.check_output(['docker', 'run', '--rm', *limits, '--entrypoint', cmd,
                                    pin['cliSourceImage'], *args], timeout=30, stderr=subprocess.PIPE)


assert hashlib.sha256(run('cat', ['/usr/bin/curl'])).hexdigest() == pin['cliSha256']
linkage = run('ldd', ['/usr/bin/curl']).decode()
assert 'not found' not in linkage
rows = []
for line in linkage.splitlines():
    fields = line.split()
    if len(fields) < 3 or fields[1] != '=>':
        continue
    name, path = fields[0], fields[2]
    assert re.fullmatch(r'lib[\w.+-]+\.so(?:\.\d+)*', name)
    assert path.startswith(('/usr/lib/x86_64-linux-gnu/', '/lib/x86_64-linux-gnu/'))
    if name in ('libc.so.6', 'libnghttp2.so.14'):
        continue
    blob = run('cat', [path])
    assert blob.startswith(b'\x7fELF') and len(blob) < 20 * 1024**2
    target = dest / name
    assert not target.exists()
    target.write_bytes(blob)
    target.chmod(0o444)
    rows.append({'file': name, 'sourcePath': path, 'sha256': sha(target), 'bytes': len(blob)})
assert 0 < len(rows) < 40 and sum(r['bytes'] for r in rows) < 80 * 1024**2
assert not (dest / 'libnghttp2.so.14').exists()
(ROOT / 'fixtures/curl-deps.json').write_text(json.dumps({'passed': True, 'sourceImage': pin['cliSourceImage'],
    'cliSha256': pin['cliSha256'], 'rows': rows, 'productionChanged': False,
    'network': 'none', 'purpose': 'HTTP/2 fixture client only; actual candidate nghttp2 is required'}, indent=2) + '\n')
print('Pinned fixture client dependencies copied; no application image or service changed.')

"""Repeatable, credential-free Debian package preparation for libfontenc."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


assert sys.argv[1:] == ['--build']
os.umask(0o077)
here = Path(__file__).resolve().parent
root = Path('/var/lib/utilibre-maintenance/security-20261122/fontenc')
spec = json.loads((here / 'fontenc-package-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert spec['productionAllowed'] is False
assert shutil.disk_usage(root).free >= spec['minimumFreeBytes']
assert sha(here / 'Dockerfile.fontenc-builder') == spec['builderDockerfileSha256']
assert sha(root / 'builddeps/authenticated.json') == spec['builddepsAuthenticatedSha256']
assert sha(root / 'source/authenticated.json') == spec['sourceAuthenticatedSha256']
builder = subprocess.check_output(['docker', 'image', 'inspect',
    'utilibre-fontenc-builder:candidate-20261122', '--format', '{{.Id}}'],
    text=True, timeout=10).strip()
assert builder == spec['builderImage']
identity = hashlib.sha256((sha(here / 'fontenc-package-inputs.json') +
                           sha(here / 'fontenc-package-inner.py')).encode()).hexdigest()[:16]
out = root / ('package-' + identity)
if out.exists():
    report = json.loads((out / 'package-build.json').read_text())
    assert report['passed'] and report['version'] == spec['packageVersion']
    assert all(sha(out / p['file']) == p['sha256'] for p in report['packages'])
    assert not report['productionChanged'] and not report['deploymentApproved']
    print('Existing exact isolated Debian packages verified; nothing installed.')
    raise SystemExit(0)
out.mkdir(mode=0o700)
os.chown(out, 65534, 65534)
source = root / 'source'
assert all(sha(source / name) == digest for name, digest in
           json.loads((here / 'fontenc-inputs.json').read_text())['files'].items())
args = ['docker', 'run', '--rm', '--network', 'none', '--read-only',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--user', '65534:65534', '--cpus', '2', '--memory', '1g',
        '--memory-swap', '1g', '--pids-limit', '128', '--log-driver', 'none',
        '--ulimit', 'core=0', '--tmpfs', '/work:rw,exec,nosuid,nodev,size=512m,mode=1777',
        '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=64m,mode=1777',
        '-v', str(source) + ':/source:ro', '-v', str(here) + ':/recipe:ro',
        '-v', str(out) + ':/output', '--entrypoint', 'python3', builder,
        '/recipe/fontenc-package-inner.py']
with (out / 'runner.log').open('wb') as log:
    result = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT,
                            timeout=330)
assert result.returncode == 0, 'Package build failed; private evidence retained'
print('Exact Debian package candidate built; no host or image installed.')

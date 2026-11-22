"""Bounded isolated native build; no host/image installation or deployment."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

os.umask(0o077)
assert sys.argv[1:] == ['--build']
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/fontenc')
inputs = json.loads((HERE / 'fontenc-inputs.json').read_text())
assert inputs['productionAllowed'] is False and shutil.disk_usage(ROOT).free >= 8 * 1024**3
source = ROOT / 'source'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(source / 'authenticated.json') == inputs['acquisitionSha256']
for name, digest in inputs['files'].items():
    assert sha(source / name) == digest
    (source / name).chmod(0o644)
source.chmod(0o755)
identity = hashlib.sha256((sha(HERE / 'fontenc-inputs.json') +
                           sha(HERE / 'fontenc-native.c')).encode()).hexdigest()[:16]
out = ROOT / ('build-' + identity)
if out.exists():
    report = json.loads((out / 'built.json').read_text())
    assert report['passed'] and report['inputSha256'] == sha(HERE / 'fontenc-inputs.json')
    assert report['fixtureSha256'] == sha(HERE / 'fontenc-native.c')
    assert report['binarySha256'] == sha(out / 'libfontenc-candidate.so.1.0.0')
    assert report['sourceScopeSha256'] == sha(out / 'source-scope.json')
    assert not report['productionChanged'] and not report['deploymentApproved']
    print('Existing exact isolated candidate verified; nothing installed.')
    raise SystemExit(0)
out.mkdir(mode=0o700)
os.chown(out, 65534, 65534)
args = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--user', '65534:65534', '--cpus', '2',
        '--memory', '1g', '--memory-swap', '1g', '--pids-limit', '128', '--log-driver', 'none',
        '--ulimit', 'core=0', '--tmpfs', '/work:rw,exec,nosuid,nodev,size=256m,mode=1777',
        '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=32m,mode=1777',
        '-v', str(source) + ':/source:ro', '-v', str(HERE) + ':/recipe:ro',
        '-v', str(out) + ':/output', '--entrypoint', 'python3', inputs['compiler'],
        '/recipe/fontenc-inner.py']
with (out / 'runner.log').open('wb') as log:
    result = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT, timeout=600)
assert result.returncode == 0, 'Native fontenc candidate failed; private evidence retained'
print('Native library candidate and bounded regression passed; nothing installed.')

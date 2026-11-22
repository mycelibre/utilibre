"""Prepare Authentik's existing vendor variant with the same native fixes.

Reuse the complete offline Debian build, preserving the ak-fips build marker.
This does not replace or attest the deployed vendor FIPS module. A later runtime
candidate must preserve its bytes, configuration, holds and provider checks.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:] in (['check-source'], ['build'])
mode = sys.argv[1]
inputs = json.loads((HERE / 'openssl-fips-inputs.json').read_text())
assert inputs['productionAllowed'] is False and inputs['approval'] == 'preparation-only'
assert shutil.disk_usage(ROOT).free >= inputs['minimumFreeBytes']
source = ROOT / 'openssl-fips-source'
source.mkdir(mode=0o755, exist_ok=True)
source.chmod(0o755)
for item in inputs['sourceFiles'] + inputs['patches']:
    original = HERE / item['file'] if item['file'] == 'openssl-ak-fips.patch' else ROOT / 'openssl-source' / item['file']
    assert hashlib.sha256(original.read_bytes()).hexdigest() == item['sha256']
    dest = source / item['file']
    if not dest.exists():
        os.link(original, dest)
    assert hashlib.sha256(dest.read_bytes()).hexdigest() == item['sha256']
    dest.chmod(0o644)
original = HERE / 'openssl-inner.py'
assert hashlib.sha256(original.read_bytes()).hexdigest() == inputs['innerSha256']
code = original.read_text()
for old, new in [
    ("recipe / 'openssl-inputs.json'", "recipe / 'openssl-fips-inputs.json'"),
    ("'a/providers/', 'a/test/'", "'a/providers/', 'a/test/', 'a/VERSION.dat'"),
    ('All eight upstream patches apply exactly', 'Eight upstream patches and vendor metadata apply exactly'),
    ('Apply eight pinned upstream OpenSSL security corrections;', 'Preserve the Authentik ak-fips build marker and apply eight pinned upstream OpenSSL security corrections;'),
]:
    assert code.count(old) == 1
    code = code.replace(old, new)
adapter = ROOT / 'openssl-fips-inner.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
adapter.chmod(0o644)
out = ROOT / ('openssl-fips-' + mode)
assert not out.exists(), 'Preserve prior attempt evidence'
out.mkdir(mode=0o700)
os.chown(out, 65534, 65534)
args = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--user', '65534:65534', '--cpus', '2',
        '--memory', '7g', '--memory-swap', '7g', '--pids-limit', '256', '--log-driver', 'none',
        '--ulimit', 'core=0', '--tmpfs', '/work:rw,exec,nosuid,nodev,size=5500m,mode=1777',
        '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=128m,mode=1777',
        '--mount', 'type=bind,src=' + str(source) + ',dst=/source,readonly',
        '--mount', 'type=bind,src=' + str(HERE) + ',dst=/recipe,readonly',
        '--mount', 'type=bind,src=' + str(adapter) + ',dst=/inner.py,readonly',
        '--mount', 'type=bind,src=' + str(out) + ',dst=/output',
        '--entrypoint', 'python3', inputs['compiler'], '/inner.py', mode]
with (out / 'runner.log').open('w') as log:
    result = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT, timeout=7200)
assert result.returncode == 0, 'Candidate failed; evidence retained, nothing deployed'
(out / 'coordinator.json').write_text(json.dumps({
    'passed': True, 'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'originalSha256': inputs['innerSha256'], 'deployed': False,
}, indent=2) + '\n')
print('Authentik OpenSSL source ' + mode + ' passed; not deployed')

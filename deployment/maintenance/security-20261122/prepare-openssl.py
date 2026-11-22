"""Build the pinned native Debian source, with upstream fixes, offline.

The resulting packages are candidates only. No image or host installation.
Reuse the retained Trixie compiler and Debian's complete native test/build rules.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

os.umask(0o077)
assert sys.argv[1:] in (['check-source'], ['build'], ['build-v2'])
attempt = sys.argv[1]
mode = 'build' if attempt == 'build-v2' else attempt
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
inputs = json.loads((HERE / 'openssl-inputs.json').read_text())
assert inputs['approval'] == 'preparation-only' and inputs['productionAllowed'] is False
assert shutil.disk_usage(ROOT).free >= inputs['minimumFreeBytes']
source = ROOT / 'openssl-source'
for item in inputs['sourceFiles'] + inputs['patches']:
    assert hashlib.sha256((source / item['file']).read_bytes()).hexdigest() == item['sha256']
# These authenticated public inputs contain no credentials. Their private
# parent remains inaccessible; the read-only compiler mount needs read access.
source.chmod(0o755)
for item in inputs['sourceFiles'] + inputs['patches']:
    (source / item['file']).chmod(0o644)
out = ROOT / ('openssl-' + attempt)
assert not out.exists(), 'Keep failed and successful evidence; select a reviewed follow-up explicitly'
out.mkdir(mode=0o700)
os.chown(out, 65534, 65534)
# Only synthetic output is writable; production data, credentials and Docker
# socket are not mounted. Source, recipe and manifest are read-only.
args = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--user', '65534:65534', '--cpus', '2',
        '--memory', '7g', '--memory-swap', '7g', '--pids-limit', '256', '--log-driver', 'none',
        '--ulimit', 'core=0', '--tmpfs', '/work:rw,exec,nosuid,nodev,size=5500m,mode=1777',
        '--tmpfs', '/tmp:rw,exec,nosuid,nodev,size=128m,mode=1777',
        '--mount', 'type=bind,src=' + str(source) + ',dst=/source,readonly',
        '--mount', 'type=bind,src=' + str(HERE) + ',dst=/recipe,readonly',
        '--mount', 'type=bind,src=' + str(out) + ',dst=/output',
        '--entrypoint', 'python3', inputs['compiler'], '/recipe/openssl-inner.py', mode]
with (out / 'runner.log').open('w') as log:
    result = subprocess.run(args, stdout=log, stderr=subprocess.STDOUT, timeout=7200)
assert result.returncode == 0, 'Candidate failed; evidence retained, nothing deployed'
print('OpenSSL ' + mode + ' passed; not deployed')

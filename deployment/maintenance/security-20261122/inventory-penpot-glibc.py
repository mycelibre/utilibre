"""Capture exact installed-package inventories from the two Penpot baselines."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

from assessment_helpers import installed_packages

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
dest = ROOT / 'dpkg-image-inventory'
inputs = json.loads((HERE / 'penpot-glibc-inputs.json').read_text())
for row in inputs['rows']:
    path = dest / (row['base'][7:] + '.json')
    if path.exists():
        assert json.loads(path.read_text())['image'] == row['base']
        continue
    blob = subprocess.check_output(['docker', 'run', '--rm', '--network', 'none',
        '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--memory', '128m', '--cpus', '.5', '--pids-limit', '32', '--log-driver', 'none',
        '--entrypoint', 'cat', row['base'], '/var/lib/dpkg/status'], timeout=30)
    packages = installed_packages(blob)
    assert len(packages) > 30
    for name, package in row['packages'].items():
        assert packages[name]['installed'] == package['installed']
    path.write_text(json.dumps({'image': row['base'], 'packages': packages,
        'complete': True, 'statusSha256': hashlib.sha256(blob).hexdigest(),
        'network': 'none'}, indent=2) + '\n')
    print(row['key'] + ': complete native inventory captured')

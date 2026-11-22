"""Read complete installed-package state from immutable candidate baselines.

Held packages are installed too. Preserve the earlier live read and record
this corrected image inventory separately; never alter package selections.
"""
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
dest.mkdir(exist_ok=True)
inputs = json.loads((HERE / 'debian-inputs.json').read_text())
for row in inputs['rows']:
    if row['key'] == 'community-yopass':
        continue  # Distroless status.d requires its separate packaging path.
    path = dest / (row['base'][7:] + '.json')
    if path.exists():
        assert json.loads(path.read_text())['image'] == row['base']
        continue
    blob = subprocess.check_output(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m', '--cpus', '.5', '--pids-limit', '32', '--log-driver', 'none', '--entrypoint', 'cat', row['base'], '/var/lib/dpkg/status'], timeout=30)
    packages = installed_packages(blob)
    assert len(packages) > 30
    path.write_text(json.dumps({'image': row['base'], 'packages': packages, 'complete': True,
                               'statusSha256': hashlib.sha256(blob).hexdigest(), 'network': 'none'}, indent=2) + '\n')
    print(row['key'] + ': complete package inventory including holds', flush=True)

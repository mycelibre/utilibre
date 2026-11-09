#!/usr/bin/env python3
"""Prepare exact reviewed Forms/Rustpad notices; never deploy or inspect content."""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

recipe = Path(__file__).resolve().parent
plan = json.loads((recipe / 'late-inputs.json').read_text())
assert plan['schemaVersion'] == 1
out = Path(sys.argv[1]).resolve()
assert str(out).startswith(('/tmp/', '/var/lib/utilibre-maintenance/')) and not out.exists()
out.mkdir(mode=0o700, parents=True)
sha = lambda value: hashlib.sha256(value).hexdigest()

def prepare(entry, data, destination):
    assert sha(data) in [entry['beforeSha256'], entry['afterSha256']], 'Unknown notice source'
    patch = recipe / entry['patch']
    assert sha(patch.read_bytes()) == entry['patchSha256'], 'Changed approved notice patch'
    destination.write_bytes(data)
    if sha(data) == entry['beforeSha256']:
        subprocess.run(['patch', '--batch', '--fuzz=0', str(destination), str(patch)], check=True, capture_output=True)
    assert sha(destination.read_bytes()) == entry['afterSha256']

forms = out / 'forms'
forms.mkdir()
for entry in plan['liberaforms']['files']:
    current = subprocess.check_output(['docker', 'exec', 'utilibre-pack-forms-app-1', 'cat', entry['target']])
    prepare(entry, current, forms / entry['file'])
source = Path('/opt/utilibre/community-src/rustpad')
rustpad = plan['rustpad']
assert subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip() == rustpad['sourceRevision']
prepare(rustpad, (source / rustpad['file']).read_bytes(), out / 'Footer.tsx')
(out / 'inputs.json').write_text(json.dumps(plan, indent=2) + '\n')
print(json.dumps({'staging': str(out), 'forms': 'validated', 'rustpad': 'validated', 'deployed': False}))

#!/usr/bin/env python3
"""Validate known native settings and prepare candidates; never update them."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

recipe = Path(__file__).resolve().parent
root = recipe.parents[1]
plan = json.loads((recipe / 'native-hooks.json').read_text())
assert plan['schemaVersion'] == 1
out = Path(sys.argv[1]).resolve()
assert str(out).startswith(('/tmp/', '/var/lib/utilibre-maintenance/')) and not out.exists()
out.mkdir(parents=True, mode=0o700)
sha = lambda data: hashlib.sha256(data).hexdigest()

gathio = plan['gathio']
source = (root / gathio['source']).read_bytes()
assert sha(source) in [gathio['beforeSha256'], gathio['afterSha256']], 'Unknown Gathio settings'
patch = recipe / gathio['patch']
assert sha(patch.read_bytes()) == gathio['patchSha256'], 'Changed approved Gathio patch'
candidate = out / 'gathio-config.toml'
candidate.write_bytes(source)
if sha(source) == gathio['beforeSha256']:
    subprocess.run(['patch', '--batch', '--fuzz=0', str(candidate), str(patch)], check=True, capture_output=True)
assert sha(candidate.read_bytes()) == gathio['afterSha256']

rallly = plan['rallly']
current = json.loads(subprocess.check_output([
    'docker', 'exec', rallly['container'], 'psql', '-X', '-qAt', '-U', 'rallly', '-d', 'rallly',
    '-c', 'SELECT footer_links FROM instance_settings WHERE id=1;',
], text=True))
assert current in [rallly['before'], rallly['after']], 'Unknown Rallly footer settings'
for field in ['before', 'after']:
    serialized = json.dumps(rallly[field], sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    assert sha(serialized) == rallly[field + 'CanonicalSha256']
assert len(rallly['after']) == 5
assert rallly['before'][:3] == rallly['after'][:3], 'Preserve both home links and upstream credit'
(out / 'rallly-footer.json').write_text(json.dumps(rallly['after'], indent=2, ensure_ascii=False) + '\n')
(out / 'native-hooks.json').write_text(json.dumps(plan, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'staging': str(out), 'gathio': 'validated', 'rallly': 'validated', 'settingsChanged': False}))

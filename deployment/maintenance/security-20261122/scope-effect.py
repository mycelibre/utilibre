"""Reuse the streaming, unstarted-image comparison for the exact Effect tree."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/effect')
inputs = json.loads((HERE / 'effect-inputs.json').read_text())
assert len(sys.argv) == 2
row = next(r for r in inputs['rows'] if r['key'] == sys.argv[1])
out = ROOT / row['key']
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and build['configurationUnchanged'] and not (out / 'scope.json').exists()
exporter = HERE.parent / 'security-20261109/zlib-check.py'
assert hashlib.sha256(exporter.read_bytes()).hexdigest() == 'cdc9aabef1034e18a3951d0d83caf32f9cf5b03dd7b72ac5bd8575d8e57bbf08'
spec = importlib.util.spec_from_file_location('effect_scope', exporter)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
before, after = [helper.export_manifest(image) for image in (row['base'], build['imageId'])]
changed = {p: {'before': before.get(p), 'after': after.get(p)} for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
prefix = row['paths']['effect'][0].lstrip('/')
assert changed and all(p == prefix or p.startswith(prefix + '/') for p in changed), 'Unexpected full-image changes'
(out / 'full-changes.json').write_text(json.dumps(changed, indent=2) + '\n')
(out / 'scope.json').write_text(json.dumps({'passed': True, 'base': row['base'], 'imageId': build['imageId'],
    'allUnrelatedImageFilesUnchanged': True, 'configurationUnchanged': True,
    'unrelatedDpkgRecordsUnchanged': True, 'unrelatedApkRecordsUnchanged': True,
    'changedFiles': len(changed), 'allowedPrefix': prefix,
    'fullChangesSha256': hashlib.sha256((out / 'full-changes.json').read_bytes()).hexdigest(),
    'limitations': 'File type, permissions, ownership, symlinks and file content compared; generated Docker hostname/resolver files excluded by the retained inspector. No user volumes attached.'}, indent=2) + '\n')
print(row['key'] + ': complete image changes restricted to the exact Effect dependency')

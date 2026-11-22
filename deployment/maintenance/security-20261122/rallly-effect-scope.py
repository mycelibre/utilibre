"""Compare every effective image file before/after the fixed Rallly build."""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/rallly-effect')
stage = json.loads((ROOT / 'stage-v2.json').read_text())
assert stage['passed'] and stage['configurationUnchanged']
assert not (ROOT / 'scope-v2.json').exists()
helper_file = Path(__file__).parents[1] / 'security-20261109/zlib-check.py'
assert hashlib.sha256(helper_file.read_bytes()).hexdigest() == 'cdc9aabef1034e18a3951d0d83caf32f9cf5b03dd7b72ac5bd8575d8e57bbf08'
spec = importlib.util.spec_from_file_location('rallly_effect_scope', helper_file)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
before = helper.export_manifest(stage['base'])
after = helper.export_manifest(stage['imageId'])
changed = {p: {'before': before.get(p), 'after': after.get(p)}
           for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
allowed = ['app/apps/web/.next', 'app/apps/web/server.js', 'app/node_modules/effect']
assert changed and all(any(p == prefix or p.startswith(prefix + '/') for prefix in allowed)
                       for p in changed), 'Unrelated image files changed'
assert before['app/node_modules/effect/package.json'] != after['app/node_modules/effect/package.json']
assert any(p.startswith('app/apps/web/.next/server/') for p in changed)
proof = {'passed': True, 'base': stage['base'], 'imageId': stage['imageId'],
         'changedFiles': len(changed), 'allowedPrefixes': allowed,
         'allOtherImageFilesUnchanged': True,
         'changedManifestSha256': hashlib.sha256(json.dumps(changed, sort_keys=True).encode()).hexdigest(),
         'productionChanged': False}
(ROOT / 'scope-v2.json').write_text(json.dumps(proof, indent=2) + '\n')
print(json.dumps(proof))

"""Reuse the scoped release/rollback gate for finite approved JS artifacts."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
admin = sys.argv[1:2] == ['--admin-build-deps']
if admin:
    sys.argv.pop(1)
profile = 'admin-build-deps' if admin else 'effect'
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122') / profile
assert len(sys.argv) == 3 and sys.argv[1] in ('check', 'apply', 'verify')
inputs = json.loads((HERE / (profile + '-inputs.json')).read_text())
assert isinstance(inputs.get('minimumFreeBytes'), int) and inputs['minimumFreeBytes'] >= 8 * 1024**3
row = next(r for r in inputs['rows'] if r['key'] == sys.argv[2])
assert row.get('releaseApproval') == 'approved'
out = ROOT / row['key']
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert set(row['reviewedEvidence']) == {'build.json', 'scope.json', 'library.json', 'application.json', 'application-adapter.json' if admin else 'application-fixture.json', 'scan-gate.json', 'after-scan.json', 'changed-files.json'}
for filename, digest in row['reviewedEvidence'].items():
    assert sha(out / filename) == digest
build = json.loads((out / 'build.json').read_text())
native = json.loads((out / 'library.json').read_text())
assert native['passed'] and native['base'] == row['base'] and native['imageId'] == build['imageId']
assert native['fixtureSha256'] == sha(HERE / ('admin-build-native.mjs' if admin else 'effect-native.cjs'))
assert len(native['checks']) == (2 if admin else 4)
if admin:
    assert {c['imageId'] for c in native['checks']} == {row['base'], build['imageId']}
    assert all(c['passed'] and c['nativeRolldownBuild'] and not c['developmentServerStarted'] for c in native['checks'])
assert all(c['passed'] for c in native['checks'] if admin or c['imageId'] == build['imageId'] or c['case'] == 'normal')
changes = json.loads((out / 'changed-files.json').read_text())
prefixes = [p for paths in row['paths'].values() for p in paths]
assert changes and all(any(p.startswith(d + '/') for d in prefixes) for p in changes)
scope = json.loads((out / 'scope.json').read_text())
assert scope['passed'] and scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
assert scope['base'] == row['base'] and scope['imageId'] == build['imageId']
assert sha(out / 'full-changes.json') == scope['fullChangesSha256']
assert len(build['packages']) == (6 if admin else 1)
for name, paths in row['paths'].items():
    assert all(build['versions'][p] == inputs['packages'][name]['version'] for p in paths)
    assert next(p for p in build['packages'] if p['name'] == name)['integrity'] == inputs['packages'][name]['integrity']
original = HERE.parent / 'security-20261114/release-libraries.mjs'
code = original.read_text()


def replace(before, after):
    global code
    assert code.count(before) == 1, before
    code = code.replace(before, after)


replace("const repo=fileURLToPath(new URL('../../../',import.meta.url)),root='/var/lib/utilibre-maintenance/security-20261114';", 'const repo=' + json.dumps(str(HERE.parents[2]) + '/') + ',root=' + json.dumps(str(ROOT)) + ';')
replace("read(new URL('./inputs.json',import.meta.url))", 'read(' + json.dumps(str(HERE / (profile + '-inputs.json'))) + ')')
replace("const pythonMode=process.argv[2]==='--python',headerMode=process.argv[2]==='--headers',gitMode=process.argv[2]==='--git';if(pythonMode||headerMode||gitMode)process.argv.splice(2,1);", 'const pythonMode=false,headerMode=false,gitMode=false;')
replace("assert((pythonMode||headerMode||gitMode?selection.rows.map(r=>r.key):['linkding-linkding','turn-option-turn','identity-worker','kitchenowl-app','pack-forms-app','services-privatebin','pollaris-pollaris','community-pairdrop']).includes(key));", "assert(['admin'].includes(key));" if admin else "assert(['spliit','wishlist'].includes(key));")
replace('build.configurationUnchanged&&build.unrelatedPackagesUnchanged', 'build.configurationUnchanged&&build.unchangedOtherAppFiles>0')
replace('scan.newHighCritical.length===0', 'scan.newFindings.length===0')
replace('inputs.databaseSha256', 'inputs.database.databaseSha256')
for relative in ('../security-20261103/release-lock.mjs', '../security-20261109/relay-idle.mjs', '../language-final/release.mjs'):
    replace("from '" + relative + "'", 'from ' + json.dumps((original.parent / relative).resolve().as_uri()))
adapter = ROOT / 'release-adapter.mjs'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / 'release-adapter.json').write_text(json.dumps({'originalSha256': sha(original), 'adapterSha256': sha(adapter),
    'scope': profile + ': exact dependency updates; same scoped Compose gate, data mounts, namespace checks and rollback'}, indent=2) + '\n')
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter), *sys.argv[1:]], check=True)

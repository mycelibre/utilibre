"""Finite native checks and existing application fixtures; no live user data."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/effect')
inputs = json.loads((HERE / 'effect-inputs.json').read_text())
assert len(sys.argv) == 3 and sys.argv[1] in ('library', 'application')
mode, key = sys.argv[1:]
row = next(r for r in inputs['rows'] if r['key'] == key)
out = ROOT / key
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and build['configurationUnchanged']
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
node = '/root/.nvm/versions/node/v24.22.3/bin/node'
if mode == 'library':
    output = out / 'library.json'
    assert not output.exists()
    checks = []
    for image in (row['base'], build['imageId']):
        for case in ('normal', 'regression'):
            name = 'maintenance-effect-' + uuid.uuid4().hex[:10]
            args = ['docker', 'run', '--rm', '--name', name, '--network', 'none', '--read-only',
                '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--user', '1000:1000',
                '--cpus', '1', '--memory', '256m', '--memory-swap', '256m', '--pids-limit', '32',
                '--log-driver', 'none', '-v', str(HERE / 'effect-native.cjs') + ':/fixture.cjs:ro',
                '--entrypoint', 'node', image, '/fixture.cjs', row['paths']['effect'][0], case]
            timeout, result = False, None
            try:
                result = subprocess.run(args, capture_output=True, timeout=4 if case == 'regression' else 20)
            except subprocess.TimeoutExpired as error:
                timeout = True
                (out / (image[7:19] + '-' + case + '.log')).write_bytes((error.stdout or b'') + (error.stderr or b'') + b'\nBounded fixture timeout\n')
            finally:
                subprocess.run(['docker', 'rm', '-f', name], capture_output=True, timeout=15)
            if result:
                (out / (image[7:19] + '-' + case + '.log')).write_bytes(result.stdout + result.stderr)
            if image == build['imageId'] or case == 'normal':
                assert not timeout and result.returncode == 0, 'Required native library check failed'
                parsed = json.loads(result.stdout)
                assert parsed['passed']
            else:
                assert timeout or result.returncode == 0, 'Baseline failed for an unrelated reason'
            checks.append({'imageId': image, 'case': case, 'passed': not timeout and result.returncode == 0,
                'timedOut': timeout, 'elapsedMs': json.loads(result.stdout).get('elapsedMs') if result and result.returncode == 0 else None})
    output.write_text(json.dumps({'passed': True, 'base': row['base'], 'imageId': build['imageId'],
        'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'checks': checks,
        'fixtureSha256': sha(HERE / 'effect-native.cjs'), 'productionChanged': False, 'network': 'none',
        'limits': 'Single synthetic 5000-character string per version, four-second timeout; upstream Union-span and TemplateLiteralParser limitations remain.'}, indent=2) + '\n')
else:
    original = HERE.parent / ('openssl-bookworm-followup/wishlist-check.mjs' if key == 'wishlist' else 'language-final/app-leaves/check-spliit.mjs')
    code = original.read_text()
    def replace(before, after):
        global code
        assert code.count(before) == 1, before
        code = code.replace(before, after)
    if key == 'wishlist':
        replace("const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012/images/wishlist'", 'const dir=' + json.dumps(str(out)))
        replace("from '../../../portal/node_modules/playwright-core/index.mjs'", 'from ' + json.dumps((HERE.parents[2] / 'portal/node_modules/playwright-core/index.mjs').as_uri()))
    else:
        subprocess.run(['docker', 'image', 'inspect', 'utilibre-postgres:17.11-alpine-gosu-security-20261011-p2'], capture_output=True, check=True, timeout=20)
        line = next(line for line in code.splitlines() if line.startswith('const image='))
        replace(line, 'const image=' + json.dumps(build['imageId']) + ';')
        replace("const report=fs.mkdtempSync('/opt/utilibre/reports/app-leaves-spliit-native-');", 'const report=' + json.dumps(str(out / 'native-report')) + ';fs.mkdirSync(report);')
        replace("from '../../../../portal/node_modules/playwright/index.mjs'", 'from ' + json.dumps((HERE.parents[2] / 'portal/node_modules/playwright/index.mjs').as_uri()))
        replace(" context.on('request',", " await context.route('**/*',route=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin){outside.add(u.origin);return route.abort();}return route.continue();});\n context.on('request',")
    adapter = out / 'native-app.mjs'
    assert not adapter.exists()
    adapter.write_text(code)
    with (out / 'native-app.log').open('wb') as log:
        subprocess.run([node, str(adapter)], stdout=log, stderr=log, timeout=300, check=True)
    if key == 'spliit':
        proof = json.loads((out / 'native-report/result.json').read_text())
        assert proof['status'] == 'passed' and proof['imageId'] == build['imageId']
        proof['passed'] = True
        (out / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
    proof = json.loads((out / 'application.json').read_text())
    assert proof['passed'] and proof['imageId'] == build['imageId']
    (out / 'application-fixture.json').write_text(json.dumps({'originalSha256': sha(original), 'adapterSha256': sha(adapter)}, indent=2) + '\n')
print(key + ': ' + mode + ' checks passed')

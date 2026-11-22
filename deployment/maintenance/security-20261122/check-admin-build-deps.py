"""Finite adapters over existing native application, scope and scanner checks."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/admin-build-deps')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'admin-build-deps-inputs.json')
row = inputs['rows'][0]
out = ROOT / 'admin'
build = read(out / 'build.json')
assert len(sys.argv) == 2 and sys.argv[1] in ('library', 'application', 'scope', 'scan', 'scan-recorded')
reuse = sys.argv[1] == 'scan-recorded'
mode = 'scan' if reuse else sys.argv[1]
assert build['passed'] and build['base'] == row['base']
node = '/root/.nvm/versions/node/v24.22.3/bin/node'
if mode == 'library':
    assert not (out / 'library.json').exists()
    semver = HERE.parents[2] / 'portal/node_modules/semver'
    assert {str(p.relative_to(semver)): sha(p) for p in semver.rglob('*') if p.is_file()} == inputs['verificationSemver']['files']
    checks = []
    for phase, image in [('before', row['base']), ('after', build['imageId'])]:
        args = ['docker', 'run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
                '--security-opt', 'no-new-privileges', '--cpus', '1', '--memory', '512m',
                '--memory-swap', '512m', '--pids-limit', '64', '--log-driver', 'none',
                '--tmpfs', '/tmp:rw,size=32m,mode=1777',
                '-v', str(HERE / 'admin-build-native.mjs') + ':/fixture.mjs:ro',
                '-v', str(HERE / 'admin-build-deps-inputs.json') + ':/inputs.json:ro',
                '-v', str(semver) + ':/verification-semver:ro',
                '--entrypoint', 'node', image, '/fixture.mjs', phase]
        result = subprocess.run(args, capture_output=True, timeout=60)
        (out / (phase + '-library.log')).write_bytes(result.stdout + result.stderr)
        assert result.returncode == 0, 'Native dependency gate failed; private evidence retained'
        check = json.loads(result.stdout.decode().strip().splitlines()[-1])
        assert check['passed'] and check['nativeRolldownBuild'] and not check['developmentServerStarted']
        checks.append({'imageId': image, **check})
    (out / 'library.json').write_text(json.dumps({'passed': True, 'base': row['base'], 'imageId': build['imageId'],
        'fixtureSha256': sha(HERE / 'admin-build-native.mjs'), 'checks': checks,
        'limitation': 'Ordinary build compatibility, not code-execution vulnerability reproduction.'}, indent=2) + '\n')
    print('Native dependency checks passed before and after')
    raise SystemExit(0)

original = HERE.parent / 'security-20261103/check-js-nov-apps.mjs' if mode == 'application' else HERE / ('scope-effect.py' if mode == 'scope' else 'scan-effect.py')
code = original.read_text()

def replace(before, after):
    global code
    assert code.count(before) == 1, before
    code = code.replace(before, after)

if mode == 'application':
    replace("root='/var/lib/utilibre-maintenance/security-20261103/js-nov'", 'root=' + json.dumps(str(ROOT)))
    runner = [node]
else:
    replace('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')')
    replace("ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/effect')", 'ROOT = Path(' + repr(str(ROOT)) + ')')
    replace("'effect-inputs.json'", "'admin-build-deps-inputs.json'")
    runner = ['python3']
    if mode == 'scope':
        replace("prefix = row['paths']['effect'][0].lstrip('/')\nassert changed and all(p == prefix or p.startswith(prefix + '/') for p in changed), 'Unexpected full-image changes'",
                "prefix = [p.lstrip('/') for paths in row['paths'].values() for p in paths]\nassert changed and all(any(p == d or p.startswith(d + '/') for d in prefix) for p in changed), 'Unexpected full-image changes'")
    else:
        replace('from assessment_helpers import package_version', 'sys_path_placeholder')
        replace('sys_path_placeholder', 'import sys\nsys.path.insert(0, ' + repr(str(HERE)) + ')\nfrom assessment_helpers import package_version')
        replace("'<reviewed Effect version>' if p['Name'] == 'effect'", "'<reviewed dependency version>' if p['Name'] in inputs['packages'] and p.get('Version') in {inputs['packages'][p['Name']]['version'], row['packages'][p['Name']]['installed']}")
        replace("for scan, version in zip(scans, ['3.20.0', '3.22.1']):\n    versions = [package_version(p) for r in scan['Results'] for p in r.get('Packages', []) if p['Name'] == 'effect']\n    assert versions and set(versions) == {version}",
                "for name, pin in inputs['packages'].items():\n    versions = [Counter(package_version(p) for r in scan['Results'] for p in r.get('Packages', []) if p['Name'] == name) for scan in scans]\n    expected = versions[0].copy()\n    previous = row['packages'][name]['installed']\n    assert previous in expected, name\n    expected[pin['version']] += expected.pop(previous)\n    assert versions[1] == expected, name")
        replace("assert removed and all(x[2:5] == ('CVE-2026-121707', 'effect', '3.20.0') for x in removed)\nassert not any(x[2] == 'CVE-2026-121707' and x[3] == 'effect' for x in after)",
                "assert removed and all(x[3] in inputs['packages'] for x in removed)\nassert not any(x[3] == 'vite' for x in after)")
suffix = '-v2' if reuse else ''
adapter = out / ('check-' + mode + suffix + ('.mjs' if mode == 'application' else '.py'))
assert not adapter.exists()
adapter.write_text(code)
(out / (mode + suffix + '-adapter.json')).write_text(json.dumps({'originalSha256': sha(original), 'adapterSha256': sha(adapter), 'network': 'none'}, indent=2) + '\n')
with (out / (mode + suffix + '-command.log')).open('wb') as log:
    subprocess.run([*runner, str(adapter), *(['--reuse-recorded-scans'] if reuse else []), 'admin'], stdout=log, stderr=log, check=True, timeout=700)
print('admin: ' + mode + ' passed')

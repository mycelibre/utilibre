"""Finite adapters for retained application checks in disposable fixtures.

No live application data, provider requests, mail, or deployment. An adapter
changes only exact image/report/fixture selection, not test assertions.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
PREVIOUS = HERE.parent / 'security-20261114'
inputs = json.loads((HERE / 'debian-inputs.json').read_text())
previous_python = json.loads((PREVIOUS / 'python-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
node = '/root/.nvm/versions/node/v24.22.3/bin/node'

for key in sys.argv[1:]:
    row = next(r for r in inputs['rows'] if r['key'] == key)
    out = ROOT / 'vendor-debian' / key
    build = json.loads((out / 'build.json').read_text())
    scope = json.loads((out / 'scope.json').read_text())
    assert build['passed'] and scope['passed'] and build['imageId'] == scope['imageId']
    assert not (out / 'application.json').exists(), 'Preserve completed evidence'
    code = ''
    env = os.environ.copy()

    def replace(old, new):
        global code
        assert code.count(old) == 1, (key, old, code.count(old))
        code = code.replace(old, new)

    if key in ('identity-server', 'pack-forms-app', 'linkding-linkding', 'galene-turn-turn'):
        original = PREVIOUS / 'check-apps.py'
        code = original.read_text()
        replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(PREVIOUS)) + ')')
        replace("ROOT=Path('/var/lib/utilibre-maintenance/security-20261114')", 'ROOT=Path(' + repr(str(ROOT)) + ')')
        config = {**inputs, 'libpqDatabaseImage': json.loads((PREVIOUS / 'inputs.json').read_text())['libpqDatabaseImage']}
        replace("I=json.loads((HERE/'inputs.json').read_text())", 'I=json.loads(' + repr(json.dumps(config)) + ')')
        replace("s['kind']=='debian'", 'True')
        code = code.replace('identity-worker', 'identity-server').replace('turn-option-turn', 'galene-turn-turn')
    elif key in ('trip-app', 'records-candlr', '13ft-app', 'unfurl-app', 'beaverhabits-app'):
        original = PREVIOUS / 'check-python-consumers.py'
        code = original.read_text()
        replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(PREVIOUS)) + ')')
        replace("ROOT=Path('/var/lib/utilibre-maintenance/security-20261114/python')", 'ROOT=Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
        config = json.loads(json.dumps(inputs))
        for r in config['rows']:
            old = next((x for x in previous_python['rows'] if x['key'] == r['key']), None)
            if old:
                r['python'] = old['python']
        replace("I=json.loads((HERE/'python-inputs.json').read_text())", 'I=json.loads(' + repr(json.dumps(config)) + ')')
    elif key in ('services-freshrss', 'community-rssbridge'):
        original = HERE.parent / ('php-20261022/check-freshrss.mjs' if key == 'services-freshrss' else 'php-20261022/check-rssbridge.mjs')
        if key == 'services-freshrss':
            env['FRESHRSS_TEST_REPORT_DIR'] = str(out)
        else:
            code = original.read_text()
            replace("from './specs.mjs'", 'from ' + json.dumps((original.parent / 'specs.mjs').as_uri()))
            replace("const dir=output+'/rssbridge',b=", 'const dir=' + json.dumps(str(out)) + ',b=')
    elif key in ('priviblur-priviblur', 'expanded-breezewiki', 'services-rsshub'):
        original = PREVIOUS / 'check-git-apps.py'
        code = original.read_text()
        replace('h=Path(__file__).resolve().parent', 'h=Path(' + repr(str(PREVIOUS)) + ')')
        replace("r=Path('/var/lib/utilibre-maintenance/security-20261114/git')", 'r=Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
        replace("i=json.loads((h/'git-inputs.json').read_text())", 'i=json.loads(' + repr(json.dumps(inputs)) + ')')
        replace("assert sha(out/'scope.json')==b['scopeSha256']", "assert json.load(open(out/'scope.json'))['passed']")
        replace("'scopeSha256':b['scopeSha256']", "'scopeSha256':sha(out/'scope.json')")
        for old, new in [('priviblur', 'priviblur-priviblur'), ('breezewiki', 'expanded-breezewiki'), ('rsshub', 'services-rsshub')]:
            replace("key=='" + old + "'", "key=='" + new + "'")
        replace("'nativeGitWorkflows':True", "'nativeApplicationCompatibility':True")
    else:
        raise ValueError('No reviewed native fixture adapter for ' + key)
    if code:
        adapter = out / ('app-check-adapter' + original.suffix)
        if adapter.exists():
            assert adapter.read_text() == code
        else:
            adapter.write_text(code)
        args = [('python3' if original.suffix == '.py' else node), str(adapter), key]
    else:
        args = [node, str(original)]
    p = subprocess.run(args, env=env, capture_output=True, timeout=900)
    (out / 'app-check-run.log').write_bytes(p.stdout + p.stderr)
    (out / 'app-check-inputs.json').write_text(json.dumps({
        'original': str(original), 'originalSha256': sha(original),
        'adapterSha256': sha(adapter) if code else None,
        'imageId': build['imageId'], 'scopeSha256': sha(out / 'scope.json'),
        'purpose': 'Retained native fixture with exact candidate and private output paths',
    }, indent=2) + '\n')
    assert p.returncode == 0, key + ': native test failed; private evidence retained'
    result = json.loads((out / 'application.json').read_text())
    assert result['passed'] and result['imageId'] == build['imageId']
    print(key + ': retained native workflow passed', flush=True)

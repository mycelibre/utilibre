"""Bind retained bounded tests/scanner to this finite vendor-package batch.

Only evidence destinations and the manifest selector change. Original and
adapted checksums are retained. There is no production activation here.
"""
import hashlib
import json
import os
from pathlib import Path
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/vendor-libs-20261111')
INPUTS = json.loads((HERE/'vendor-inputs.json').read_text())

def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def execute(path, changes, keys, label):
    p = HERE.parent/path
    assert sha(p) == INPUTS['fixtureHashes'][path], 'Retained checker changed'
    code = p.read_text()
    for old, new, count in changes:
        assert code.count(old) == count, (path, old, code.count(old))
        code = code.replace(old, new)
    a = ROOT/'adapters'/(label+'.py'); a.parent.mkdir(exist_ok=True)
    if a.exists(): assert a.read_text() == code
    else: a.write_text(code)
    sys.argv = [str(p), *keys]
    exec(compile(code, str(a), 'exec'), {'__file__':str(p), '__name__':'__main__'})
    for key in keys:
        name = 'scan-gate.json' if label == 'scan' else 'consumer.json'
        f = ROOT/key/name; report = json.loads(f.read_text())
        report['adapter'] = {'originalFixture':str(p), 'originalSha256':sha(p),
                             'path':str(a), 'sha256':sha(a),
                             'changes':'Finite manifest/evidence roots; same native checks, network limits and assertions. Scan asserts selected exact vendor versions.'}
        f.write_text(json.dumps(report,indent=2)+'\n')

mode, *keys = sys.argv[1:]
assert mode in ('consumer', 'scan') and keys and len(keys) == len(set(keys))
specs = [next(r for r in INPUTS['rows'] if r['key'] == key) for key in keys]
if mode == 'scan':
    execute('security-20261109/zlib-scan.py', [
        ("LIBRARIES = '--libraries-nov11' in sys.argv\nif LIBRARIES: sys.argv.remove('--libraries-nov11')", 'LIBRARIES = True', 1),
        ('/var/lib/utilibre-maintenance/libraries-20261111', str(ROOT), 1),
        ('../releases-20261111/libraries-inputs.json', '../releases-20261111/vendor-inputs.json', 1),
        ("assert 'zlib@1.4-r0' in actual", "assert all(n+'@'+INPUTS['packages'][spec['branch']+'/'+n]['version'] in actual for n in spec['packages'])", 1),
    ], keys, 'scan')
else:
    for s in specs:
        key = s['key']; profile = s['consumerProfile']
        if profile in ('static-nginx', 'nginx-runtime'):
            execute('security-20261109/check-musl-nginx.py', [
                ("ROOT = Path('/var/lib/utilibre-maintenance/libraries-20261111' if LIBRARIES else '/var/lib/utilibre-maintenance/security-20261109')", "ROOT = Path('"+str(ROOT)+"')", 1),
                ("HERE / ('../releases-20261111/libraries-inputs.json' if LIBRARIES else 'musl-inputs.json')", "HERE / '../releases-20261111/vendor-inputs.json'", 1),
                ("out=ROOT/key if LIBRARIES else ROOT/'musl'/key", 'out=ROOT/key', 1),
            ], [key], 'nginx')
        elif profile in ('php-runtime', 'postgres-runtime'):
            execute('security-20261109/check-musl-runtimes.py', [
                ('/var/lib/utilibre-maintenance/security-20261109/musl', str(ROOT), 1),
                ("HERE / 'musl-inputs.json'", "HERE / '../releases-20261111/vendor-inputs.json'", 1),
            ], [key], 'runtime')
        else:
            assert key == 'kittygram-kittygram' and profile == 'special-native'
            execute('security-20261109/check-musl-special.py', [
                ('/var/lib/utilibre-maintenance/security-20261109/musl', str(ROOT), 1),
                ("ROOT / 'valkey' / 'build.json'", "Path('/var/lib/utilibre-maintenance/security-20261109/musl/valkey/build.json')", 1),
            ], [key], 'kittygram')

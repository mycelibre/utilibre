"""Thin reuse of existing builders, scope, native checks and release gates."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/remaining-vendor')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
    'check': 'check-debian.py', 'scan': 'scan-debian.py', 'release': 'release-debian.py', 'http2': 'check-leaf-http2.py',
    'prepare-headers': '../security-20261114/prepare-headers.py', 'check-headers': '../security-20261114/check-headers.py'}
assert mode in names
original = (HERE / names[mode]).resolve()
code = original.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)


if mode in ('prepare-headers', 'check-headers'):
    assert args == ['gathio-postgres']
    if mode == 'prepare-headers':
        replace('HERE=Path(__file__).resolve().parent;', 'HERE=Path(' + repr(str(original.parent)) + ');')
    else:
        replace('H=Path(__file__).resolve().parent;', 'H=Path(' + repr(str(original.parent)) + ');')
        replace("compiler=json.load(open(R.parent/'native-builder/build.json'))", "compiler={'imageId':I['headerCompiler']}")
        replace("scope=json.load(open(out/'scope.json'))", "scope=json.load(open(out/'header-scope.json'))")
        replace("(out/'scope.json').read_bytes()", "(out/'header-scope.json').read_bytes()")
        replace("for s in I['rows']:", "for s in [r for r in I['rows'] if r['key']=='gathio-postgres']:")
    replace("Path('/var/lib/utilibre-maintenance/security-20261114/headers')", 'Path(' + repr(str(ROOT)) + ')')
    replace("HERE/'headers-inputs.json'" if mode == 'prepare-headers' else "H/'headers-inputs.json'",
            'Path(' + repr(str(HERE / 'remaining-vendor-inputs.json')) + ')')
    if mode == 'prepare-headers':
        replace("new URL('headers-inputs.json',here)", 'new URL(' + repr((HERE / 'remaining-vendor-inputs.json').as_uri()) + ')')
else:
    code = relocate_directory(code, HERE)
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/leaves')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("'debian-inputs.json'", "'remaining-vendor-inputs.json'").replace('"debian-inputs.json"', '"remaining-vendor-inputs.json"')
    code = code.replace("'debian-leaf-inputs.json'", "'remaining-vendor-inputs.json'")
    if mode == 'prepare':
        assert args == ['identity-server']
        replace("checks='''  if(s.packages.libc6){", """checks='''  for(const library of s.loadLibraries){
   assert.equal(library,'/usr/lib/x86_64-linux-gnu/libnghttp2.so.14');
   assert(!native(image,'ldd',[library]).includes('not found'));checks++;
  }
  if(s.packages.libc6){""")
    elif mode == 'scan':
        replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    elif mode == 'check':
        assert args == ['identity-server']
    elif mode == 'http2':
        inputs = json.loads((HERE / 'remaining-vendor-inputs.json').read_text())
        proof = ROOT / 'fixtures/curl-deps.json'
        assert hashlib.sha256(proof.read_bytes()).hexdigest() == inputs['http2Fixture']['clientDependenciesSha256']
        dependencies = json.loads(proof.read_text())
        assert dependencies['passed'] and dependencies['sourceImage'] == inputs['http2Fixture']['cliSourceImage']
        assert not (ROOT / 'fixtures/curl-deps/libnghttp2.so.14').exists()
        for row in dependencies['rows']:
            assert hashlib.sha256((ROOT / 'fixtures/curl-deps' / row['file']).read_bytes()).hexdigest() == row['sha256']
        replace("'-e', 'LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu',", "'-e', 'LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:/fixture-libs', '-v', str(ROOT / 'fixtures/curl-deps') + ':/fixture-libs:ro',")
        replace("version = run(base + ['--version']).decode()", """linkage = run(base[:-3] + ['-e', 'LD_TRACE_LOADED_OBJECTS=1'] + base[-3:] + ['--version']).decode()
                assert 'libnghttp2.so.14 => /usr/lib/x86_64-linux-gnu/libnghttp2.so.14' in linkage
                assert 'not found' not in linkage
                version = run(base + ['--version']).decode()""")
    elif mode == 'release' and args[-1] == 'identity-server':
        row = next(r for r in json.loads((HERE / 'remaining-vendor-inputs.json').read_text())['rows'] if r['key'] == args[-1])
        proof = ROOT / 'vendor-debian' / row['key'] / 'http2-native.json'
        assert hashlib.sha256(proof.read_bytes()).hexdigest() == row['nativeHttp2Evidence']
        assert json.loads(proof.read_text())['passed']
adapter = ROOT / ('run-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'purpose': 'Exact remaining inputs; retained isolated tests and full-scope release gates'}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

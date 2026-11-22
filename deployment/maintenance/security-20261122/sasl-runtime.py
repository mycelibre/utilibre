"""Signed SASL leaf update through retained isolated preparation/runtime gates."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/sasl')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
         'scan': 'scan-debian.py', 'release': 'release-debian.py',
         'consumer': '../security-20261109/check-musl-runtimes.py', 'check': 'check-debian.py'}
assert mode in names
if mode == 'release':
    assert len(args) == 2 and args[0] in ('check', 'apply', 'verify')
    inputs = json.loads((HERE / 'sasl-inputs.json').read_text())
    row = next(r for r in inputs['rows'] if r['key'] == args[1])
    assert row.get('releaseApproval') == 'approved'
    out = ROOT / 'vendor-debian' / row['key']
    app = json.loads((out / 'application.json').read_text())
    build = json.loads((out / 'build.json').read_text())
    for name, field in [('application-native.json', 'nativeSha256'), ('consumer.json', 'consumerSha256')]:
        file = out / name
        assert hashlib.sha256(file.read_bytes()).hexdigest() == app[field]
        value = json.loads(file.read_text())
        assert value['passed'] and value['imageId'] == build['imageId']
    if row['key'] == 'gathio-postgres':
        assert hashlib.sha256((out / 'sdk-fixture/cert.pem').read_bytes()).hexdigest() == app['syntheticCertificateSha256']
original = (HERE / names[mode]).resolve()
code = relocate_directory(original.read_text(), original.parent)


def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)


if mode == 'consumer':
    inputs = json.loads((HERE / 'sasl-inputs.json').read_text())
    assert hashlib.sha256(original.read_bytes()).hexdigest() == inputs['consumerFixtureSha256']
    replace("Path('/var/lib/utilibre-maintenance/security-20261109/musl')", 'Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
    replace("HERE / 'musl-inputs.json'", 'Path(' + repr(str(HERE / 'sasl-inputs.json')) + ')')
    # Debian consumer compatibility uses its existing libc. Full SASL ABI and
    # native client/encoding checks are separately required by scope/build.
    replace("'/lib/ld-musl-x86_64.so.1'", "'/lib/x86_64-linux-gnu/libc.so.6'")
else:
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("'debian-inputs.json'", "'sasl-inputs.json'").replace('"debian-inputs.json"', '"sasl-inputs.json"')
    if mode == 'prepare':
        replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages['libsasl2-2']){
   const fixture=inputs.sasLFixture.path;assert.equal(sha(fs.readFileSync(fixture)),inputs.sasLFixture.binarySha256);
   const result=JSON.parse(docker('run','--rm',...limits,'--user','65534:65534','--ulimit','core=0','-v',fixture+':/native:ro','--entrypoint','/native',image));
   assert.deepEqual(result,{passed:true,encodingChecks:4,nativeExternalExchange:true,unsupportedRejected:true,network:'none'});checks+=6;
  }
  if(s.packages.libc6){""")
    elif mode == 'scan':
        replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    elif mode == 'check':
        assert args == ['community-rssbridge'], 'Only the existing RSS-Bridge native fixture uses this adapter'

adapter = ROOT / ('run-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'changes': ['finite SASL manifest and private output paths', 'synthetic public SASL API fixture; retained Debian consumer checks'],
}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

"""Finite vendor OpenSSL successor via existing preparation and release gates."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/bookworm-successor')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
         'scan': 'scan-debian.py', 'release': 'release-debian.py', 'check': 'check-debian.py',
         'consumer': 'sasl-runtime.py', 'app': 'check-sasl-apps.py'}
assert mode in names
inputs = json.loads((HERE / 'bookworm-successor-inputs.json').read_text())
(ROOT / 'fixtures').mkdir(mode=0o700, exist_ok=True)
assert hashlib.sha256((ROOT / 'source/retained-fix.json').read_bytes()).hexdigest() == inputs['retainedSourceProofSha256']
original = HERE / names[mode]
code = relocate_directory(original.read_text(), HERE)


def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)


if mode in ('consumer', 'app'):
    replace("Path('/var/lib/utilibre-maintenance/security-20261122/sasl')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("'sasl-inputs.json'", "'bookworm-successor-inputs.json'")
    if mode == 'consumer':
        assert len(args) == 1
        args = ['consumer', *args]
    else:
        assert len(args) == 1 and args[0] != 'wishlist-app'
        replace("'sasl-runtime.py'", "'bookworm-successor.py'")
else:
    code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
    code = code.replace("'debian-inputs.json'", "'bookworm-successor-inputs.json'").replace('"debian-inputs.json"', '"bookworm-successor-inputs.json"')
    if mode == 'prepare':
        replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages.libssl3){
   const script=new URL('../openssl-bookworm-followup/native-crypto.sh',here).pathname;
   assert.equal(sha(fs.readFileSync(script)),inputs.nativeFixture.cryptoSha256);
   const result=docker('run','--rm',...limits,'--user','65534:65534','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',script+':/native.sh:ro','--entrypoint','sh',image,'/native.sh');
   assert.equal(result,'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED');checks+=8;
   const algorithms=native(image,'sh',['-ec','openssl list -providers -provider default -provider legacy; openssl list -cipher-algorithms; openssl list -digest-algorithms; openssl ciphers -v ALL']);
   assert.equal(algorithms,native(s.base,'sh',['-ec','openssl list -providers -provider default -provider legacy; openssl list -cipher-algorithms; openssl list -digest-algorithms; openssl ciphers -v ALL']));checks++;
  }
  if(s.packages.libc6){""")
    elif mode == 'scan':
        replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    elif mode == 'check':
        assert args == ['community-rssbridge']
    elif mode == 'release':
        assert len(args) == 2 and args[0] in ('check', 'apply', 'verify')
        row = next(r for r in inputs['rows'] if r['key'] == args[1])
        assert row.get('releaseApproval') == 'approved'
        out = ROOT / 'vendor-debian' / row['key']
        for name, digest in row['nativeEvidence'].items():
            assert name in ('native-tls.json', 'dtls-regression.json', 'consumer.json', 'application-native.json')
            file = out / name
            assert hashlib.sha256(file.read_bytes()).hexdigest() == digest
            value = json.loads(file.read_text())
            assert value['passed'] and value['imageId'] == json.loads((out / 'build.json').read_text())['imageId']
adapter = ROOT / ('driver-' + mode + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('driver-' + mode + '.json')).write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'changes': ['finite vendor successor manifest and private paths', 'retained native crypto, consumer, application and source-parity gates'],
}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

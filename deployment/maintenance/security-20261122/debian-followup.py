"""Finite second vendor batch; reuse the existing isolated and release gates.

No version resolution or automatic approval. The follow-up has its own immutable
baseline/evidence so the earlier releases remain independently reproducible.
"""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
libraries = '--libraries' in sys.argv
openssl_extra = '--openssl-extra' in sys.argv
openssl_relay = '--openssl-relay' in sys.argv
openssl = '--openssl' in sys.argv or openssl_extra or openssl_relay
assert not (libraries and openssl)
if libraries or openssl:
    assert sys.argv[1] == ('--libraries' if libraries else '--openssl-relay' if openssl_relay else '--openssl-extra' if openssl_extra else '--openssl')
    sys.argv.pop(1)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122') / ('libraries' if libraries else 'openssl-relay-runtime' if openssl_relay else 'openssl-extra-runtime' if openssl_extra else 'openssl-runtime' if openssl else 'followup')
mode, *args = sys.argv[1:]
names = {'acquire': 'acquire-debian.py', 'inventory': 'inventory-debian.py',
         'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
         'check': 'check-debian.py', 'check-extra': 'check-debian-extra.py',
         'scan': 'scan-debian.py', 'release': 'release-debian.py'}
assert mode in names
manifest = 'openssl-relay-runtime-inputs.json' if openssl_relay else 'openssl-extra-runtime-inputs.json' if openssl_extra else 'openssl-runtime-inputs.json' if openssl else 'debian-library-inputs.json' if libraries else 'debian-followup-inputs.json'
wanted = 'debian-library-wanted.json' if libraries else 'debian-followup-wanted.json'
if mode != 'acquire':
    selection = json.loads((HERE / manifest).read_text())
    assert selection.get('status') != 'rejected' or mode == 'inventory', selection.get('reason')
    if openssl:
        built = ROOT.parent / 'openssl-build-v2/built.json'
        assert hashlib.sha256(built.read_bytes()).hexdigest() == selection['sourceBuildSha256']
        proof = json.loads(built.read_text())
        assert proof['passed'] and proof['network'] == 'none' and not proof['deployed']
        for pin in selection['packages'].values():
            assert proof['artifacts'][pin['file']] == pin['sha256']
else:
    assert libraries, 'Rejected Nginx acquisition is archived; do not repeat it'
assert args == ['--download'] if mode == 'acquire' else not args if mode == 'inventory' else bool(args)
original = HERE / names[mode]
code = original.read_text()
code = relocate_directory(code, HERE)
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/vendor-debian')", 'Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
code = code.replace("'debian-inputs.json'", repr(manifest))
code = code.replace('"debian-inputs.json"', json.dumps(manifest))
code = code.replace("'debian-wanted.json'", repr(wanted))

def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)

if mode == 'prepare' and openssl:
    replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages.libssl3t64){
   const fixture=root+'/fixtures/openssl';
   assert.equal(sha(fs.readFileSync(fixture)),inputs.nativeFixture.cliSha256);
   const script=new URL('../openssl-bookworm-followup/native-crypto.sh',here).pathname;
   assert.equal(sha(fs.readFileSync(script)),inputs.nativeFixture.cryptoSha256);
   const result=docker('run','--rm',...limits,'--user','65534:65534','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',fixture+':/native/openssl:ro','-v',script+':/native.sh:ro','-e','PATH=/native:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin','--entrypoint','sh',image,'/native.sh');
   assert.equal(result,'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED');checks+=8;
  }
  if(s.packages.libc6){""")
elif mode == 'release' and openssl:
    # These locally built library changes additionally require exact TLS and
    # upstream regression evidence plus a published corresponding-source offer.
    # A clean scanner comparison alone never authorizes the candidate.
    replace("assert selected.get('releaseApproval') == 'approved'", """assert selected.get('releaseApproval') == 'approved'
release_out = ROOT / 'vendor-debian' / selected['key']
for name in ('native-tls.json', 'upstream-regression.json'):
    evidence = release_out / name
    assert hashlib.sha256(evidence.read_bytes()).hexdigest() == selected['opensslEvidence'][name]
    checked = json.loads(evidence.read_text())
    assert checked['passed'] and checked['base'] == selected['base']
    assert checked['imageId'] == json.loads((release_out / 'build.json').read_text())['imageId']
source_offer = json.loads((ROOT.parent / 'openssl-source-offer.json').read_text())
assert source_offer['passed'] and source_offer['published']
assert source_offer['sourceBuildSha256'] == inputs['sourceBuildSha256']
assert source_offer['sha256'] == selected['opensslEvidence']['sourceArchiveSha256']
for directory in source_offer['destinations']:
    assert hashlib.sha256((Path(directory) / source_offer['file']).read_bytes()).hexdigest() == source_offer['sha256']
""")
elif mode == 'prepare' and libraries:
    replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages.liblzma5){
   const fixture=root+'/fixtures/lzma-native';
   assert.equal(sha(fs.readFileSync(fixture)),inputs.lzmaFixture.binarySha256);
   assert.equal(sha(fs.readFileSync(new URL('lzma-native.c',here))),inputs.lzmaFixture.sourceSha256);
   assert.equal(docker('run','--rm',...limits,'--user','65534:65534','-v',fixture+':/native:ro','--entrypoint','/native',image),'LZMA_NATIVE_PASSED checks=7');checks+=7;
  }
  if(s.packages.libc6){""")
elif mode == 'prepare':
    # The actual HTTP/TLS behaviour is checked by the retained isolated fixture
    # after the complete-file comparison. This first check rejects broken ABI.
    replace("checks='''  if(s.packages.libc6){", "checks='''  if(s.packages.nginx){\n   const info=native(image,'sh',['-ec','nginx -V 2>&1']);assert(info.includes('nginx/1.22.1')&&info.includes('--with-http_ssl_module'));checks++;\n  }\n  if(s.packages.libc6){")
elif mode == 'scan':
    replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
if mode == 'release' and openssl_relay:
    helper = HERE.parent / 'security-20261109/relay-idle.mjs'
    assert hashlib.sha256(helper.read_bytes()).hexdigest() == selection['relayIdleHelperSha256']
    # Preserve the failed port-only adapter and checks. This version counts
    # sockets belonging to the exact TURN process; host-network peers using
    # the same ephemeral range cannot falsely block a scoped release.
    replace('code = original.read_text()', '''code = original.read_text()
assert code.count('import {boundRelaySockets}') == 1
code = code.replace('import {boundRelaySockets}', 'import {boundRelaySockets,ownedRelaySocketCount}')
old = "assert.equal(boundRelaySockets(tables,get('min-port'),get('max-port')),0,"
assert code.count(old) == 1
code = code.replace(old, "assert.equal(ownedRelaySocketCount(x.State.Pid,get('min-port'),get('max-port')),0,")
old = " const tables=['udp','udp6','tcp','tcp6'].map(t=>docker('exec',x.Name,'cat','/proc/net/'+t));"
assert code.count(old) == 1
code = code.replace(old, '')
''')
    code = code.replace('release-debian-adapter-v4.mjs', 'release-debian-adapter-owned-sockets.mjs')
adapter = ROOT / (('run-v3-' if mode == 'release' and openssl_relay else 'run-v2-') + names[mode])
if adapter.exists():
    assert adapter.read_text() == code, 'Do not overwrite a changed adapter'
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({
    'original': str(original), 'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(adapter.read_bytes()).hexdigest(),
    'changes': ['finite manifest/evidence paths', 'ordinary selected native-library fixture'],
}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

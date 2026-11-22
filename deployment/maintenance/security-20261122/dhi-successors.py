"""Reuse reviewed offline library gates for two exact vendor-variant images."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/dhi-successors')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
         'check-extra': 'check-debian-extra.py', 'scan': 'scan-debian.py', 'release': 'release-debian.py',
         'tls': 'check-openssl-tls.py', 'http2': 'check-leaf-http2.py', 'regression': 'check-openssl-regressions.py'}
assert mode in names
inputs = json.loads((HERE / 'dhi-successor-inputs.json').read_text())
assert hashlib.sha256((ROOT / 'source/retained-fixes.json').read_bytes()).hexdigest() == inputs['sourceProofSha256']
original = HERE / names[mode]
code = relocate_directory(original.read_text(), HERE)
for old in ('/var/lib/utilibre-maintenance/security-20261122/openssl-runtime',
            '/var/lib/utilibre-maintenance/security-20261122/leaves',
            '/var/lib/utilibre-maintenance/security-20261122'):
    code = code.replace('Path(' + repr(old) + ')', 'Path(' + repr(str(ROOT)) + ')')
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/vendor-debian')", 'Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
for old in ('debian-inputs.json', 'openssl-runtime-inputs.json', 'debian-leaf-inputs.json'):
    code = code.replace(repr(old), "'dhi-successor-inputs.json'").replace(json.dumps(old), '"dhi-successor-inputs.json"')


def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)


if mode == 'prepare':
    replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages.libssl3t64){
   const fixture=root+'/fixtures/openssl';
   assert.equal(sha(fs.readFileSync(fixture)),inputs.nativeFixture.cliSha256);
   const script=new URL('../openssl-bookworm-followup/native-crypto.sh',here).pathname;
   assert.equal(sha(fs.readFileSync(script)),inputs.nativeFixture.cryptoSha256);
   const result=docker('run','--rm',...limits,'--user','65534:65534','--tmpfs','/tmp:rw,size=16m,mode=1777','-v',fixture+':/native/openssl:ro','-v',script+':/native.sh:ro','-e','PATH=/native:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin','--entrypoint','sh',image,'/native.sh');
   assert.equal(result,'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED');checks+=8;
  }
  if(s.packages.libc6){""")
elif mode == 'check-extra':
    assert args == ['expanded-penpot-exporter']
    replace("elif key == 'expanded-penpot-backend':", "elif key == 'expanded-penpot-exporter':")
    replace('"for(const role of [\'backend\'])"', '"for(const role of [\'exporter\'])"')
    replace("checks = ['System/private raster output parity, native codec set, TTF/OTF/WOFF/WOFF2 roundtrips']", "checks = ['System/private raster output parity and codec inventory; separate native font rendering required']")
elif mode == 'scan':
    replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    proof_file = ROOT / 'baseline-inventories.json'
    assert hashlib.sha256(proof_file.read_bytes()).hexdigest() == inputs['baselineInventorySha256']
    proof = json.loads(proof_file.read_text())
    assert proof['passed'] and proof['allRawFindingsPreserved']
    extras = {}
    for row in proof['rows']:
        out = ROOT / 'vendor-debian' / row['key']
        assert hashlib.sha256((out / 'before-inventory-scan.json').read_bytes()).hexdigest() == row['rawScanSha256']
        scope = json.loads((out / 'scope.json').read_text())
        changes = json.loads((out / 'changes.json').read_text())
        assert scope['passed'] and scope['allUnrelatedImageFilesUnchanged']
        assert hashlib.sha256((out / 'changes.json').read_bytes()).hexdigest() == scope['changesSha256']
        for alias in row['selectedMetadataAliases'].values():
            assert alias['path'].lstrip('/') not in changes, 'Inherited metadata changed'
        extras[row['image']] = row['extras']
    transforms = [
        ("packages={p['Name']:package_version(p) for p in osrows[0]['Packages']}", "scanner_package_records=osrows[0]['Packages']"),
        ("    assert packages==expected, 'Incomplete or changed scanner package inventory'",
         "    from scanner_inventory import validate_inventory\n    packages,inherited_duplicates=validate_inventory(scanner_package_records,expected," + repr(extras) + "[row['base']])\n    assert packages==expected, 'Incomplete or changed scanner package inventory'"),
        ("'rawScanSha256':m.sha(raw),'network':'none'", "'rawScanSha256':m.sha(raw),'network':'none','inheritedDuplicateScannerVersions':inherited_duplicates"),
    ]
    injection = ''.join('replace(' + repr(old) + ', ' + repr(new) + ')\n' for old, new in transforms)
    replace("adapter = ROOT / 'scan-debian-adapter-v4.py'", injection + "adapter = ROOT / 'scan-debian-adapter-v4.py'")
elif mode == 'regression':
    replace("'The other six fixes retain exact source and complete native-suite evidence. '",
            "'The other six fixes have signed vendor source parity; this vendor binary has not run the complete upstream suite here. '")
elif mode == 'release':
    assert len(args) == 2 and args[0] in ('check', 'apply', 'verify')
    selected = next(r for r in inputs['rows'] if r['key'] == args[1])
    assert selected.get('releaseApproval') == 'approved'
    required = {'native-tls.json', 'upstream-regression.json'}
    if selected['key'].endswith('exporter'):
        required |= {'http2-native.json', 'font-native.json'}
    assert set(selected['nativeEvidence']) == required
    out = ROOT / 'vendor-debian' / selected['key']
    for name, digest in selected['nativeEvidence'].items():
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
    'changes': ['finite signed DHI manifest and evidence paths', 'retained crypto, native, scope and all-severity gates'],
}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

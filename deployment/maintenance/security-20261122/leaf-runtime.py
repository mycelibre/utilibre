"""Finite signed-library follow-up through the existing offline/release gates."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/leaves')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py', 'scope': 'scope-debian.py',
         'check': 'check-debian.py', 'check-extra': 'check-debian-extra.py', 'scan': 'scan-debian.py', 'release': 'release-debian.py'}
assert mode in names
if mode == 'release':
    inputs = json.loads((HERE / 'debian-leaf-inputs.json').read_text())
    selected = next(r for r in inputs['rows'] if r['key'] == args[1])
    if selected['key'] in inputs['http2Fixture']['selectedKeys']:
        out = ROOT / 'vendor-debian' / selected['key']
        proof_file = out / 'http2-native.json'
        assert hashlib.sha256(proof_file.read_bytes()).hexdigest() == selected['nativeHttp2Evidence']
        proof = json.loads(proof_file.read_text())
        assert proof['passed'] and proof['base'] == selected['base']
        assert proof['imageId'] == json.loads((out / 'build.json').read_text())['imageId']
    if 'libheif1' in selected['packages']:
        out = ROOT / 'vendor-debian' / selected['key']
        proof_file = out / 'heif-native.json'
        assert hashlib.sha256(proof_file.read_bytes()).hexdigest() == selected['nativeHeifEvidence']
        proof = json.loads(proof_file.read_text())
        assert proof['passed'] and proof['base'] == selected['base']
        assert proof['imageId'] == json.loads((out / 'build.json').read_text())['imageId']
original = HERE / names[mode]
code = relocate_directory(original.read_text(), HERE)
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122/vendor-debian')", 'Path(' + repr(str(ROOT / 'vendor-debian')) + ')')
code = code.replace("'debian-inputs.json'", "'debian-leaf-inputs.json'").replace('"debian-inputs.json"', '"debian-leaf-inputs.json"')


def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)


if mode == 'prepare':
    replace("checks='''  if(s.packages.libc6){", """checks='''  for(const library of s.loadLibraries){
   assert(/^\\/usr\\/lib\\/x86_64-linux-gnu\\/[a-zA-Z0-9_.+-]+$/.test(library));
   const result=native(image,'ldd',[library]);
   assert(!result.includes('not found')&&result.includes('libc.so.6'),'Native library dependency missing');checks++;
  }
  if(s.packages.libc6){""")
elif mode == 'scan':
    replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
elif mode == 'check-extra' and args == ['expanded-penpot-exporter']:
    replace("elif key == 'expanded-penpot-backend':", "elif key == 'expanded-penpot-exporter':")
    replace('"for(const role of [\'backend\'])"', '"for(const role of [\'exporter\'])"')
    replace("checks = ['System/private raster output parity, native codec set, TTF/OTF/WOFF/WOFF2 roundtrips']", "checks = ['System/private raster output parity and native codec set; exporter has no new font-roundtrip test']")
adapter = ROOT / ('run-' + names[mode] + ('-exporter' if args == ['expanded-penpot-exporter'] else ''))
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'changes': ['finite signed vendor manifest and private evidence paths', 'native loader checks; application tests remain separately required'],
}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

"""Finite Ubuntu XML adapter; existing full-scope/offline/release mechanisms."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/mumble-xml')
mode, *args = sys.argv[1:]
names = {'inventory': 'inventory-debian.py', 'prepare': 'prepare-debian.py',
         'scope': 'scope-debian.py', 'scan': 'scan-debian.py', 'release': 'release-debian.py'}
assert mode in names
original = HERE / names[mode]
code = relocate_directory(original.read_text(), HERE)
code = code.replace("Path('/var/lib/utilibre-maintenance/security-20261122')", 'Path(' + repr(str(ROOT)) + ')')
code = code.replace("'debian-inputs.json'", "'mumble-xml-inputs.json'").replace('"debian-inputs.json"', '"mumble-xml-inputs.json"')


def replace(before, after):
    global code
    assert code.count(before) == 1, (mode, before)
    code = code.replace(before, after)


if mode == 'prepare':
    replace("checks='''  if(s.packages.libc6){", """checks='''  if(s.packages.libxml2){
   const fixture=root+'/fixtures/xml-native';
   assert.equal(sha(fs.readFileSync(fixture)),inputs.xmlFixture.binarySha256);
   assert.equal(sha(fs.readFileSync(new URL('../native-final/libxml2-old-abi.c',here))),inputs.xmlFixture.sourceSha256);
   const answer=docker('run','--rm',...limits,'--user','65534:65534','-v',fixture+':/native:ro','--entrypoint','/native',image);
   assert.equal(answer,'old-header native entity/input allocators and chunked parsing passed');checks+=4;
  }
  if(s.packages.libc6){""")
elif mode == 'scan':
    replace('"ROOT=m.ROOT; inputs=json.loads', '"ROOT=Path(' + repr(str(ROOT)) + '); inputs=json.loads')
    # Replace the exact assessment family, never omit OS package coverage.
    code = code.replace('"scan[\'Metadata\'][\'OS\'][\'Family\']==\'debian\'"', '"scan[\'Metadata\'][\'OS\'][\'Family\']==\'ubuntu\'"')
    code = code.replace('"r[\'Type\']==\'debian\'"', '"r[\'Type\']==\'ubuntu\'"')
    code = code.replace('"f[\'type\']==\'debian\'"', '"f[\'type\']==\'ubuntu\'"')
elif mode == 'release':
    # Preserve Mumble's existing aggregate active-session safeguard. This reads
    # an instantaneous count only; no peers, credentials or attendance history.
    anchor = "for relative in ('../security-20261103/release-lock.mjs'"
    extra = '''replace("spec.kind==='debian'?'vendor-debian/':''", "['debian','ubuntu'].includes(spec.kind)?'vendor-debian/':''")
replace(" if(key!=='galene-turn-turn')return;", """ if(key==='mumble-mumble'){
  const count=command('nsenter',['-t',String(x.State.Pid),'-n','ss','-Hnt','state','established','(','sport','=',':64738',')']).trim().split('\\\\n').filter(Boolean).length;
  assert.equal(count,0,'Active Mumble control connections: postpone this service');return;
 }
 if(key!=='galene-turn-turn')return;""")
'''
    replace(anchor, extra + anchor)
    replace("adapter = ROOT / 'release-debian-adapter-v4.mjs'", "adapter = ROOT / 'release-mumble-adapter-v2.mjs'")
adapter = ROOT / ('run-' + mode + ('-v2' if mode == 'release' else '') + '.py')
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('adapter-' + mode + '.json')).write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(code.encode()).hexdigest(),
    'purpose': 'Single Ubuntu XML input; actual native parser and Mumble idle guard'}, indent=2) + '\n')
sys.argv = [str(adapter), *args]
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

"""Replay the retained official Nginx binary overlay for RSS-Bridge.

Its Debian nginx package metadata describes an older replaced binary. Updating
that package would downgrade the actual executable and alter its module set.
Keep the existing packaging method, native PHP tests and complete-file gates.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'rssbridge-nginx/rssbridge'
INPUTS = json.loads((HERE / 'rssbridge-nginx-inputs.json').read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
mode, *args = sys.argv[1:]
assert mode in ('prepare', 'scope', 'check', 'scan', 'release')
assert args in (['check'], ['apply'], ['verify']) if mode == 'release' else not args

if mode == 'scope':
    exporter = HERE.parent / 'security-20261109/zlib-check.py'
    assert sha(exporter) == INPUTS['exporterSha256']
    spec = importlib.util.spec_from_file_location('scope_helper', exporter)
    helper = importlib.util.module_from_spec(spec); spec.loader.exec_module(helper)
    b = json.loads((OUT / 'build.json').read_text())
    assert b['passed'] and b['version'] == INPUTS['version']
    before, after = [helper.export_manifest(i) for i in (b['base'], b['imageId'])]
    paths = set(p.lstrip('/') for p in b['changedFiles'])
    # Permit only the exact new notice directory and its parents if absent.
    for p in list(paths):
        parent = Path(p).parent
        while str(parent) != '.':
            if str(parent) not in before:
                paths.add(str(parent))
            parent = parent.parent
    changes = {p: {'before': before.get(p), 'after': after.get(p)}
               for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
    assert set(changes) <= paths and 'usr/sbin/nginx' in changes
    assert before['var/lib/dpkg/status'] == after['var/lib/dpkg/status']
    assert all(before[p] == after.get(p) for p in before if p.startswith('etc/'))
    (OUT / 'changes.json').write_text(json.dumps(changes, indent=2) + '\n')
    proof = {'passed': True, 'base': b['base'], 'imageId': b['imageId'],
             'allUnrelatedImageFilesUnchanged': True, 'configurationUnchanged': True,
             'unrelatedDpkgRecordsUnchanged': True, 'changedCount': len(changes),
             'changesSha256': sha(OUT / 'changes.json'),
             'scope': 'Complete content/type/mode/ownership/link comparison; timestamps excluded. Exact executable and upstream copyright notice only.'}
    (OUT / 'scope.json').write_text(json.dumps(proof, indent=2) + '\n')
    print('RSS-Bridge exact executable/license scope passed')
    raise SystemExit(0)

original = (HERE.parent / 'security-20261028' / ('nginx-debian.mjs' if mode == 'prepare' else 'check-nginx-rssbridge.mjs')) if mode in ('prepare', 'check') else HERE / ('scan-debian.py' if mode == 'scan' else 'release-debian.py')
code = original.read_text()

def replace(old, new):
    global code
    assert code.count(old) == 1, (mode, old)
    code = code.replace(old, new)

if mode == 'prepare':
    replace("const root='/var/lib/utilibre-maintenance/security-20261028/nginx-debian';", 'const root=' + json.dumps(str(ROOT / 'rssbridge-nginx')) + ';')
    replace("new URL('./nginx-debian-inputs.json',import.meta.url)", json.dumps(str(HERE / 'rssbridge-nginx-inputs.json')))
    replace("' 50426 nginx/binary-amd64/Packages.gz'", "' '+pin.packagesBytes+' nginx/binary-amd64/Packages.gz'")
    assert code.count('1.30.6') == 2
    code = code.replace('1.30.6', '1.30.7')
elif mode == 'check':
    replace("root='/var/lib/utilibre-maintenance/security-20261028',dir=root+'/nginx-debian/rssbridge'", 'root=' + json.dumps(str(ROOT)) + ',dir=root+"/rssbridge-nginx/rssbridge"')
    # The second retained fixture keeps its helper image and source paths;
    # only its report root changes, not the tests or network boundary.
    replace("const fixture=dir+'/consumer-adapter.mjs';", "code=code.replace(\"out=root+'/nginx-debian/rssbridge'\",'out='+JSON.stringify(dir));\nconst fixture=dir+'/consumer-adapter.mjs';")
else:
    code = code.replace('HERE = Path(__file__).resolve().parent', 'HERE = Path(' + repr(str(HERE)) + ')')
    code = code.replace("'debian-inputs.json'", "'rssbridge-nginx-inputs.json'")
    code = code.replace("ROOT / 'vendor-debian'", "ROOT / 'rssbridge-nginx'")
    code = code.replace("ROOT/'vendor-debian'", "ROOT/'rssbridge-nginx'")
    code = code.replace('scan-debian-adapter-v4.py', 'scan-rssbridge-nginx-adapter.py')
    code = code.replace('release-debian-adapter-v4.mjs', 'release-rssbridge-nginx-adapter.mjs')
    code = code.replace('scan-debian-adapter.json', 'scan-rssbridge-nginx-adapter.json')
    code = code.replace('release-debian-adapter.json', 'release-rssbridge-nginx-adapter.json')
    if mode == 'scan':
        replace("replace('baseline=json.loads',", "replace(\"ROOT/'before/security.json'\",\"ROOT/'followup/before/security.json'\")\nreplace('baseline=json.loads',")
    else:
        replace("replace('scan.newHighCritical.length===0',", "replace(\"spec.kind==='debian'?'vendor-debian/':''\",\"spec.kind==='debian'?'rssbridge-nginx/':''\")\nreplace('scan.newHighCritical.length===0',")
        replace("original = HERE.parent / 'security-20261114/release-libraries.mjs'", """binary = json.loads((out / 'build.json').read_text())
assert binary['packageMetadataPreserved'] and binary['version'] == inputs['version']
assert binary['pin'] == inputs['package']
assert binary['binarySha256'] == inputs['package']['binarySha256']
assert binary['changedFiles'] == ['/usr/local/share/licenses/nginx-1.30.7/copyright', '/usr/sbin/nginx']
original = HERE.parent / 'security-20261114/release-libraries.mjs'""")
        replace("replace('scan.newHighCritical.length===0',", """replace('build.unrelatedPackagesUnchanged', 'build.packageMetadataPreserved&&read(dir+"/scope.json").unrelatedDpkgRecordsUnchanged')
replace('scan.targetedBefore>0&&', 'build.binarySha256===inputs.package.binarySha256&&')
replace('scan.newHighCritical.length===0',""")
adapter = ROOT / ('rssbridge-' + original.name)
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / ('rssbridge-adapter-' + mode + '.json')).write_text(json.dumps({
    'original': str(original), 'originalSha256': sha(original), 'adapterSha256': sha(adapter),
    'changes': ['finite version/input/evidence selection; unchanged native tests and deployment safeguards'],
}, indent=2) + '\n')
if mode in ('prepare', 'check'):
    subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter)], check=True, timeout=600)
else:
    sys.argv = [str(adapter), *args, 'rssbridge']
    exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

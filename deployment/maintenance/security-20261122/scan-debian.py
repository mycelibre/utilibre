"""Frozen all-severity assessment, retaining unresolved vendor findings.

This produces assessment evidence, not deployment approval. Exact package
inventory is required. A version change does not hide an existing advisory.
"""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
original = HERE / 'scan-nginx.py'
code = original.read_text()


def replace(old, new):
    global code
    assert code.count(old) == 1, old
    code = code.replace(old, new)


replace('HERE=Path(__file__).resolve().parent', 'HERE=Path(' + repr(str(HERE)) + ')')
replace('ROOT=m.ROOT; inputs=m.INPUTS', "ROOT=m.ROOT; inputs=json.loads((HERE/'debian-inputs.json').read_text())")
replace('baseline=json.loads', 'sys.path.insert(0,str(HERE))\nfrom assessment_helpers import finding_identity, package_version\nbaseline=json.loads')
replace("out=ROOT/'nginx'/key", "out=ROOT/'vendor-debian'/key")
replace("scan['Metadata']['OS']['Family']=='alpine'", "scan['Metadata']['OS']['Family']=='debian'")
replace("r['Type']=='alpine'", "r['Type']=='debian'")
replace("ROOT/'apk-inventory'", "ROOT/'dpkg-image-inventory'")
replace("p['Version']+('-'+p['Release'] if p.get('Release') else '')", 'package_version(p)')
replace("{n:p['V'] for n,p in recorded['packages'].items()}", "{n:p['installed'] for n,p in recorded['packages'].items()}")
replace("for name in row['packages']:expected[name]=inputs['packages'][name]['version']", "for name,p in row['packages'].items():expected[name]=inputs['packages'][p['package']]['version']")
replace("for name in row['packages']:assert packages[name]==inputs['packages'][name]['version']", "for name,p in row['packages'].items():assert packages[name]==inputs['packages'][p['package']]['version']")
replace("f['type']=='alpine'", "f['type']=='debian'")
replace("return (f['id'],f['package'],f['installed'],f['severity'],target)", "return finding_identity(f,row['packages'])")
replace("assert not targeted(after), 'Targeted findings remain; do not exclude a severity'", "# Retain remaining vendor findings; this is assessment, not approval.")
replace("'targetedAfter':0", "'targetedAfter':len(targeted(after)),'remainingTargetedFindings':targeted(after),'deploymentApproved':False")
replace("str(result['targetedBefore'])+' targeted records removed; '", "str(result['targetedBefore']-result['targetedAfter'])+' targeted records removed; '")
adapter = ROOT / 'scan-debian-adapter-v4.py'
if adapter.exists():
    assert adapter.read_text() == code
else:
    adapter.write_text(code)
(ROOT / 'scan-debian-adapter.json').write_text(json.dumps({
    'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
    'adapterSha256': hashlib.sha256(adapter.read_bytes()).hexdigest(),
    'helpersSha256': hashlib.sha256((HERE / 'assessment_helpers.py').read_bytes()).hexdigest(),
    'changes': ['finite Debian inputs', 'exact dpkg inventory', 'retain unresolved advisories across selected vendor version changes', 'no deployment approval'],
}, indent=2) + '\n')
exec(compile(code, str(adapter), 'exec'), {'__file__': str(adapter), '__name__': '__main__'})

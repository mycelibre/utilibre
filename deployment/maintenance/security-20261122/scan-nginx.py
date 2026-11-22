"""All-severity, same-database assessment; no exclusions or acceptance changes."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

os.umask(0o077)
HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('prepare_nginx',HERE/'prepare-nginx.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
ROOT=m.ROOT; inputs=m.INPUTS
baseline=json.loads((ROOT/'before/security.json').read_text())
db=ROOT/'scan-cache/db/trivy.db'
assert m.sha(db)==inputs['database']['databaseSha256']
assert m.sha('/opt/utilibre/maintenance/bin/trivy')==inputs['database']['scannerSha256']
assert baseline['database']['updatedAt']==inputs['database']['metadata']['UpdatedAt']
scanner_inputs=json.loads((ROOT/'scanner-inputs.json').read_text())
assert scanner_inputs['databaseSha256']==inputs['database']['databaseSha256']
for filename,digest in scanner_inputs['javaDatabase'].items():
    assert filename in ('trivy-java.db','metadata.json')
    assert m.sha(ROOT/'scan-cache/java-db'/filename)==digest, 'Java database snapshot changed'


def identity(f):
    target=f['type'] if f['type'] in ('alpine','debian','ubuntu') else f['target']
    return (f['id'],f['package'],f['installed'],f['severity'],target)


for key in sys.argv[1:]:
    row=next(x for x in inputs['rows'] if x['key']==key)
    out=ROOT/'nginx'/key;build=json.loads((out/'build.json').read_text());assert build['passed']
    assert not (out/'scan-gate.json').exists(),'Preserve completed evidence'
    raw=out/'after-scan.json'
    if not raw.exists():
        args=['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image',
            '--config','/dev/null','--ignorefile','/dev/null','--skip-check-update','--skip-version-check',
            '--skip-vex-repo-update','--disable-telemetry','--cache-dir',str(ROOT/'scan-cache'),
            '--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update',
            '--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs',
            '--image-src','docker','--format','json','--output',str(raw),build['imageId']]
        with (out/'scanner.log').open('wb') as log:
            p=subprocess.run(args,stdout=log,stderr=log,timeout=330,env={**os.environ,'GOMAXPROCS':'1','GOMEMLIMIT':'1GiB','TRIVY_DISABLE_TELEMETRY':'true'})
        assert p.returncode==0,'Scanner failed; no clearance'
    scan=json.loads(raw.read_text());assert scan['Metadata']['ImageID']==build['imageId']
    assert scan['Metadata']['OS']['Family']=='alpine'
    osrows=[r for r in scan['Results'] if r['Type']=='alpine'];assert len(osrows)==1
    packages={p['Name']:p['Version']+('-'+p['Release'] if p.get('Release') else '') for p in osrows[0]['Packages']}
    inventory_file=ROOT/'apk-inventory'/(row['base'][7:]+'.json')
    recorded=json.loads(inventory_file.read_text());assert recorded['image']==row['base']
    expected={n:p['V'] for n,p in recorded['packages'].items()}
    for name in row['packages']:expected[name]=inputs['packages'][name]['version']
    assert packages==expected, 'Incomplete or changed scanner package inventory'
    for name in row['packages']:assert packages[name]==inputs['packages'][name]['version']
    before=next(x['findings'] for x in baseline['images'] if x['id']==row['base'])
    after=[{'id':v['VulnerabilityID'],'package':v['PkgName'],'installed':v['InstalledVersion'],
            'severity':v['Severity'],'type':r['Type'],'target':r['Target']}
           for r in scan['Results'] for v in r.get('Vulnerabilities',[])]
    added=[f for f in after if identity(f) not in {identity(x) for x in before}]
    targeted=lambda items:[f for f in items if f['type']=='alpine' and f['package'] in row['packages']]
    assert not targeted(after), 'Targeted findings remain; do not exclude a severity'
    assert not added,'New findings require review'
    result={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'base':row['base'],'imageId':build['imageId'],
            'targetedBefore':len(targeted(before)),'targetedAfter':0,'newFindings':added,
            'remaining':{s:sum(f['severity']==s for f in after) for s in ('CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN')},
            'inventorySha256':m.sha(inventory_file),'databaseSha256':inputs['database']['databaseSha256'],'scannerSha256':inputs['database']['scannerSha256'],
            'advisoryUpdatedAt':inputs['database']['metadata']['UpdatedAt'],'rawScanSha256':m.sha(raw),'network':'none'}
    (out/'scan-gate.json').write_text(json.dumps(result,indent=2)+'\n')
    print(key+': '+str(result['targetedBefore'])+' targeted records removed; '+str(len(after))+' unrelated findings retained',flush=True)

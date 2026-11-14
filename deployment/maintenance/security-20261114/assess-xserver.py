"""Same-database Xserver comparison; retain raw version-based backport findings."""
import json,os,hashlib,subprocess
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114');out=r/'xserver';s=json.load(open(out/'stage.json'));i=json.load(open(h/'inputs.json'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();assert sha(r/'scan-cache/db/trivy.db')==i['databaseSha256']
args=['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image','--config','/dev/null','--ignorefile','/dev/null','--skip-check-update','--skip-version-check','--skip-vex-repo-update','--disable-telemetry','--cache-dir',str(r/'scan-cache'),'--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',str(out/'after-scan.json'),s['image']]
with (out/'scanner.log').open('wb') as f:p=subprocess.run(args,stdout=f,stderr=f,timeout=330,env={**os.environ,'TRIVY_DISABLE_TELEMETRY':'true','GOMAXPROCS':'1','GOMEMLIMIT':'1GiB'})
assert p.returncode==0;new=json.load(open(out/'after-scan.json'));assert new['Metadata']['ImageID']==s['image'];old=next(x for x in json.load(open(r/'before-security.json'))['images'] if x['id']==s['base']);assert old['status']=='checked'
def key(v):return tuple(v[k] for k in ('id','package','severity','type'))+(('' if v['package']=='xvfb' else v['installed']),('' if v['type']=='debian' else v['target']))
known={key(v) for v in old['findings']};found=[{'id':v['VulnerabilityID'],'package':v['PkgName'],'severity':v['Severity'],'type':row['Type'],'target':row['Target'],'installed':v['InstalledVersion']} for row in new['Results'] for v in row.get('Vulnerabilities',[])];added=[v for v in found if v['severity'] in ('HIGH','CRITICAL') and key(v) not in known];assert not added,added
assert any(v['package']=='xvfb' for v in found);assert sha(r/'scan-cache/db/trivy.db')==i['databaseSha256']
(out/'assessment.json').write_text(json.dumps({'passed':True,'date':datetime.now(timezone.utc).isoformat(),'imageId':s['image'],'base':s['base'],'databaseSha256':i['databaseSha256'],'rawScanSha256':sha(out/'after-scan.json'),'newHighCritical':added,'rawBackportFindingsRetained':True,'note':'Raw matching is unchanged. Exact upstream patch, native behavior and binary-package scope are separate review gates.'},indent=2)+'\n');print('Xserver same-snapshot assessment passed; raw backport records retained')

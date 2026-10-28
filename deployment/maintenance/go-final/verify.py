#!/usr/bin/env python3
import hashlib,json,os,subprocess,tarfile,sys
from pathlib import Path
os.umask(0o077)
HELPERS='--helpers-oct28' in sys.argv
OCT28='--oct28' in sys.argv or HELPERS
ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/go' if OCT28 else '/var/lib/utilibre-maintenance/go-final-20261011')
if HELPERS: ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/go-helpers')
if hasattr(os,'sched_getaffinity'):os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
def files(image):
 c=subprocess.check_output(['docker','create','--entrypoint','/bin/true',image],text=True).strip()
 try:
  p=subprocess.Popen(['docker','export',c],stdout=subprocess.PIPE);result={}
  with tarfile.open(fileobj=p.stdout,mode='r|') as archive:
   for e in archive:
    name='/'+e.name.lstrip('./')
    if name in ['/etc/hosts','/etc/hostname','/etc/resolv.conf']:continue
    if e.isfile():
     h=hashlib.sha256();f=archive.extractfile(e)
     while b:=f.read(1024*1024):h.update(b)
     result[name]=h.hexdigest()
    elif e.issym() or e.islnk():result[name]='link:'+e.linkname
  assert p.wait()==0
  return result
 finally:subprocess.run(['docker','rm',c],stdout=subprocess.DEVNULL,check=True)
rows=[]
specs=json.loads((ROOT/'build.json').read_text())['rows'] if not HELPERS else [dict(json.loads((ROOT/k/'build.json').read_text()),baseId=json.loads((ROOT/k/'build.json').read_text())['base']) for k in sys.argv[1:] if k!='--helpers-oct28']
for s in specs:
 before,after=files(s['baseId']),files(s['imageId']);changes=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p));assert changes==(s['changedFiles'] if HELPERS else [s['binary']]),changes
 if OCT28:
  gate=json.loads((ROOT/s['key']/'scan-gate.json').read_text());assert gate['passed'] and gate['imageId']==s['imageId'] and gate['newHighCritical']==0
  scan=json.loads((ROOT/s['key']/'after-scan.json').read_text())
 else:
  output=ROOT/'output'/(s['key']+'-scan.json')
  subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(output),s['imageId']],check=True,stdout=subprocess.DEVNULL)
  scan=json.loads(output.read_text());stdlib=[p for r in scan.get('Results',[]) for p in r.get('Packages',[]) if p.get('Name')=='stdlib'];assert stdlib and all(p['Version']=='v1.26.9' for p in stdlib)
  findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])];assert not [v for v in findings if v['PkgName']=='stdlib']
 if OCT28:findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
 if HELPERS:(ROOT/s['key']/'inventory.json').write_text(json.dumps({'passed':True,'imageId':s['imageId'],'changedPaths':changes,'unchangedFiles':len(after)-len(changes)},indent=2)+'\n')
 rows.append({'key':s['key'],'imageId':s['imageId'],'status':'passed','changedPaths':changes,'unchangedFiles':len(after)-1,'go':s['compilerVersion'] if HELPERS else '1.26.10' if OCT28 else '1.26.9','counts':{n:sum(v['Severity']==n for v in findings) for n in ['CRITICAL','HIGH','MEDIUM','LOW']}})
(ROOT/('inventory-'+ '-'.join(s['key'] for s in specs)+'.json' if HELPERS else 'inventory.json')).write_text(json.dumps({'status':'passed','rows':rows},indent=2)+'\n');print(str(len(rows))+' binary-only images and real Go inventories passed.')

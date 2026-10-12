#!/usr/bin/env python3
"""Image rootfs equivalence outside the single patched module and new dependency tree."""
import hashlib,json,os,subprocess,sys,tarfile,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parent
os.umask(0o077)
if hasattr(os,'sched_getaffinity'):os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
s=next(x for x in json.loads((ROOT/'images.json').read_text()) if x['key']==sys.argv[1])
rollback=len(sys.argv)>2 and sys.argv[2]=='--privacy-rollback'
assert len(sys.argv)<=2 or rollback and s['key']=='spliit'
if rollback:s['candidate']='utilibre-spliit:1.29.0-privacy-rollback-20261011';s['version']=s['old']
out=Path(tempfile.mkdtemp(prefix='app-leaves-verify-'+s['key']+'-',dir='/opt/utilibre/reports'))
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
before,after=files(s['baseId']),files(s['candidate'])
changes=[p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)]
privacy=[]
if s['key']=='spliit':
 privacy=['/usr/app/.next/server/chunks/ssr/_0ze3y-h._.js','/usr/app/.next/server/chunks/ssr/_1bkjedk._.js','/usr/app/.next/static/chunks/3m-0x3ae8tu5n.js','/usr/local/share/utilibre-language/spliit-no-flags.json']
 assert all(p in changes for p in privacy)
for p in changes:
 assert p in privacy or not rollback and (p.startswith(s['path']+'/') or p.startswith('/opt/utilibre-app-reviewed-leaves/') or p=='/usr/local/share/utilibre-language/app-leaf.json'),p
image=json.loads(subprocess.check_output(['docker','image','inspect',s['candidate']],text=True))[0]
subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(out/'trivy.json'),image['Id']],check=True,stdout=subprocess.DEVNULL)
scan=json.loads((out/'trivy.json').read_text());inventories=[p for r in scan.get('Results',[]) for p in r.get('Packages',[]) if p.get('Name')==s['library']]
assert inventories and all(p['Version']==s['version'] for p in inventories),inventories
v=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
if not rollback:assert not [x for x in v if x['PkgName']==s['library'] and x['Severity'] in ['CRITICAL','HIGH']]
record={'status':'passed','verifiedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),**s,'imageId':image['Id'],'applicationFilesOutsideSelectedLibraryAndDocumentedPrivacyPatchUnchanged':True,'privacyExceptionPaths':privacy,'changedFiles':len(changes),'counts':{n:sum(x['Severity']==n for x in v) for n in ['CRITICAL','HIGH','MEDIUM','LOW']},'inventoriedLibraryVersions':sorted(set(p['Version'] for p in inventories)),'productionChanged':False}
(out/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(out)

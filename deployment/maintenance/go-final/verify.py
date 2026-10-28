#!/usr/bin/env python3
import hashlib,json,os,subprocess,tarfile,sys
from pathlib import Path
os.umask(0o077)
BSON='--bson-oct28' in sys.argv
ZOD='--zod-oct28' in sys.argv
CODEC_CADDY='--codec-caddy-oct28' in sys.argv
FILELOCK='--filelock-oct28' in sys.argv
TEXT='--text-oct28' in sys.argv
OAUTH='--oauth-oct28' in sys.argv
CODEC='--codec-oct28' in sys.argv
HEALTH='--health-oct28' in sys.argv
MARKDOWN='--markdown-oct28' in sys.argv
SYMFONY='--symfony-oct28' in sys.argv
NLTK='--weka-oct28' in sys.argv
MSGPACK='--msgpack-oct28' in sys.argv
BLKID='--blkid-oct28' in sys.argv
JOSE_LEAF='--jose-leaf-oct28' in sys.argv
JOSE='--jose-oct28' in sys.argv or JOSE_LEAF
DRF='--drf-oct28' in sys.argv
DNS='--dnspython-oct28' in sys.argv
AUTHLIB='--authlib-oct28' in sys.argv
SERVICES='--services-oct28' in sys.argv
RUNTIME='--runtime-oct28' in sys.argv or SERVICES
JOSE_CADDY='--jose-caddy-oct28' in sys.argv
CADDY='--caddy-oct28' in sys.argv or JOSE_CADDY
HELPERS=BSON or ZOD or CODEC_CADDY or FILELOCK or TEXT or OAUTH or CODEC or HEALTH or MARKDOWN or SYMFONY or NLTK or MSGPACK or BLKID or '--helpers-oct28' in sys.argv or CADDY or RUNTIME or AUTHLIB or DNS or DRF or JOSE
OCT28='--oct28' in sys.argv or HELPERS
ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/go' if OCT28 else '/var/lib/utilibre-maintenance/go-final-20261011')
if HELPERS: ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/'+('bson' if BSON else 'zod' if ZOD else 'codec-caddy' if CODEC_CADDY else 'filelock' if FILELOCK else 'text' if TEXT else 'oauth' if OAUTH else 'codec' if CODEC else 'health' if HEALTH else 'markdown' if MARKDOWN else 'symfony' if SYMFONY else 'nltk' if NLTK else 'msgpack' if MSGPACK else 'blkid' if BLKID else 'jose-caddy' if JOSE_CADDY else 'jose-leaf' if JOSE_LEAF else 'jose' if JOSE else 'drf' if DRF else 'dnspython' if DNS else 'authlib' if AUTHLIB else 'caddy' if CADDY else 'go-services' if SERVICES else 'go-runtime' if RUNTIME else 'go-helpers'))
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
    elif e.issym() or e.islnk():result[name]=('hardlink:' if ZOD and e.islnk() else 'link:')+e.linkname
  assert p.wait()==0
  return result
 finally:subprocess.run(['docker','rm',c],stdout=subprocess.DEVNULL,check=True)
rows=[]
specs=json.loads((ROOT/'build.json').read_text())['rows'] if not HELPERS else [dict(json.loads((ROOT/k/'build.json').read_text()),baseId=json.loads((ROOT/k/'build.json').read_text())['base']) for k in sys.argv[1:] if k not in ['--bson-oct28','--zod-oct28','--codec-caddy-oct28','--filelock-oct28','--text-oct28','--oauth-oct28','--codec-oct28','--health-oct28','--markdown-oct28','--symfony-oct28','--weka-oct28','--msgpack-oct28','--blkid-oct28','--jose-leaf-oct28','--jose-caddy-oct28','--jose-oct28','--helpers-oct28','--caddy-oct28','--runtime-oct28','--services-oct28','--authlib-oct28','--dnspython-oct28','--drf-oct28']]
for s in specs:
 before,after=files(s['baseId']),files(s['imageId']);hardlink_changes=[]
 if ZOD:
  from tar_hardlinks import resolve_hardlinks
  # pnpm hardlinked identical files become independent files when the package
  # is replaced. Account for that storage-layout change without hiding a byte
  # or symbolic-link change, and reject layout changes outside this package.
  hardlink_changes=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p) and any(x.get(p,'').startswith('hardlink:') for x in [before,after]))
  assert all(any(p.startswith(root+'/') for root in s['paths']['zod']) for p in hardlink_changes)
  before,after=resolve_hardlinks(before),resolve_hardlinks(after)
 changes=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p));removed_bytecode=[]
 if FILELOCK or OAUTH or MSGPACK or AUTHLIB or DNS:
  # Native pip --no-compile removes the previous package's cached bytecode.
  # Only deletion inside this exact dependency is accepted; never new pyc or
  # unrelated caches/application files. Keep every removed path in evidence.
  removed_bytecode=[p for p in changes if p.startswith(s['site']+('/filelock/' if FILELOCK else '/oauthlib/' if OAUTH else '/msgpack/' if MSGPACK else '/dns/' if DNS else '/authlib/')) and '/__pycache__/' in p and p.endswith('.pyc') and p in before and p not in after]
  changes=[p for p in changes if p not in removed_bytecode]
 expected=json.loads((ROOT/s['key']/'changed-files.json').read_text()) if MARKDOWN or ZOD else s['changedFiles'] if HELPERS else [s['binary']]
 assert changes==sorted(expected),changes
 if OCT28:
  gate=json.loads((ROOT/s['key']/'scan-gate.json').read_text());assert gate['passed'] and gate['imageId']==s['imageId'] and gate['newHighCritical']==0
  scan=json.loads((ROOT/s['key']/'after-scan.json').read_text())
 else:
  output=ROOT/'output'/(s['key']+'-scan.json')
  subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(output),s['imageId']],check=True,stdout=subprocess.DEVNULL)
  scan=json.loads(output.read_text());stdlib=[p for r in scan.get('Results',[]) for p in r.get('Packages',[]) if p.get('Name')=='stdlib'];assert stdlib and all(p['Version']=='v1.26.9' for p in stdlib)
  findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])];assert not [v for v in findings if v['PkgName']=='stdlib']
 if OCT28:findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
 if HELPERS:(ROOT/s['key']/'inventory.json').write_text(json.dumps({'passed':True,'imageId':s['imageId'],'changedPaths':changes,'packageHardlinkLayoutChanges':hardlink_changes,'removedPackageBytecode':removed_bytecode,'unchangedFiles':len(after)-len(changes)},indent=2)+'\n')
 rows.append({'key':s['key'],'imageId':s['imageId'],'status':'passed','changedPaths':changes,'unchangedFiles':len(after)-1,'go':None if BSON or ZOD or FILELOCK or OAUTH or MARKDOWN or SYMFONY or NLTK or MSGPACK or BLKID or AUTHLIB or DNS or DRF else s['compilerVersion'] if HELPERS else '1.26.10' if OCT28 else '1.26.9','counts':{n:sum(v['Severity']==n for v in findings) for n in ['CRITICAL','HIGH','MEDIUM','LOW']}})
(ROOT/('inventory-'+ '-'.join(s['key'] for s in specs)+'.json' if HELPERS else 'inventory.json')).write_text(json.dumps({'status':'passed','rows':rows},indent=2)+'\n');print(str(len(rows))+' declared-file inventories and exact-artifact scan gates passed.')

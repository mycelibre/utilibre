#!/usr/bin/env python3
"""Exact candidate image, frozen scanner and native route checks; no activation."""
import collections,hashlib,json,os,pathlib,subprocess,sys,tarfile,time,secrets
os.umask(0o077)
if hasattr(os,'sched_getaffinity'):os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
HERE=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/var/lib/utilibre-maintenance/security-20261109/xnet')
m=json.loads((HERE/'xnet-inputs.json').read_text());key=sys.argv[1];s=next(x for x in m['rows'] if x['key']==key)
original=ROOT/key;b=json.loads((original/'compiled.json').read_text());assert b['passed'] and b['base']==s['base']
combined=sys.argv[2:]==['--with-zlib'];assert sys.argv[2:] in ([],['--with-zlib'])
d=original/'combined' if combined else original
image_base=s['base'];candidate=s['candidate'];zlib=None
if combined:
 d.mkdir(exist_ok=False)
 zkey={'rimgo':'rimgo-rimgo','anonymousoverflow':'reader-evaluation-anonymousoverflow'}[key]
 zd=ROOT.parent/'zlib'/zkey;zlib=json.loads((zd/'build.json').read_text());scope=json.loads((zd/'scope.json').read_text())
 assert zlib['passed'] and scope['passed'] and zlib['base']==s['base'] and scope['imageId']==zlib['imageId']
 assert scope['allUnrelatedImageFilesUnchanged'] and scope['zlibAbiPreserved'] and zlib['unrelatedPackagesUnchanged']
 image_base=zlib['imageId'];candidate=s['candidate']+'-zlib'
 for phase in ['before','after']:
  result=json.loads((ROOT/'regression'/('regression-'+phase+'.json')).read_text());assert result['passed'] and result['benignTextPreserved']

def run(*args,**kw):return subprocess.check_output(args,timeout=180,**kw)
def sha(p):return hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
def inspect(i):return json.loads(run('docker','image','inspect',i))[0]
def files(i):
 c=run('docker','create','--entrypoint','/bin/true',i).decode().strip()
 try:
  p=subprocess.Popen(['docker','export',c],stdout=subprocess.PIPE);result={}
  with tarfile.open(fileobj=p.stdout,mode='r|') as tar:
   for e in tar:
    n='/'+e.name.lstrip('./')
    if n in ['/etc/hosts','/etc/hostname','/etc/resolv.conf']:continue
    if e.isfile():
     h=hashlib.sha256();f=tar.extractfile(e)
     while chunk:=f.read(1024*1024):h.update(chunk)
     result[n]=(h.hexdigest(),e.mode,e.uid,e.gid)
    elif e.issym() or e.islnk():result[n]=('link:'+e.linkname,e.mode,e.uid,e.gid)
  assert p.wait(timeout=180)==0
  return result
 finally:run('docker','rm',c)
assert os.statvfs(ROOT).f_bavail*os.statvfs(ROOT).f_frsize>=m['execution']['minimumFreeBytes']
assert sha(original/key)==b['binarySha256'];stage=d/'image';stage.mkdir(exist_ok=False)
import shutil
shutil.copy2(original/key,stage/'binary');(stage/'binary').chmod(0o755)
(stage/'Dockerfile').write_text('FROM '+image_base+'\nCOPY binary '+s['binary']+'\n')
with (d/'image-build.log').open('w') as log:subprocess.run(['docker','build','--network','none','--pull=false','-t',candidate,str(stage)],env={**os.environ,'DOCKER_BUILDKIT':'0'},stdout=log,stderr=log,timeout=180,check=True)
old,new=inspect(image_base),inspect(candidate);assert old['Config']==new['Config'];image=new['Id']
before,after=files(image_base),files(image);delta=sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p));assert delta==[s['binary']],delta
for tag,ref in [('before',s['base']),('after',image)]:
 with (d/(tag+'-scan.log')).open('w') as log:
  subprocess.run(['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image','--config','/dev/null','--ignorefile','/dev/null','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--skip-db-update','--skip-java-db-update','--skip-check-update','--skip-version-check','--skip-vex-repo-update','--disable-telemetry','--offline-scan','--timeout','3m','--image-src','docker','--format','json','--list-all-pkgs','--output',str(d/(tag+'-scan.json')),ref],stdout=log,stderr=log,timeout=200,check=True)
def findings(x):return {(v['VulnerabilityID'],v['PkgName'],v['InstalledVersion'],v['Severity']) for r in x.get('Results',[]) for v in r.get('Vulnerabilities',[])}
a=json.loads((d/'before-scan.json').read_text());z=json.loads((d/'after-scan.json').read_text());assert a['Metadata']['ImageID']==s['base'] and z['Metadata']['ImageID']==image
fa,fz=findings(a),findings(z);assert any(x[0]==m['advisory'] for x in fa);assert not any(x[0]==m['advisory'] for x in fz)
newhc=[x for x in fz-fa if x[3] in ['HIGH','CRITICAL']];assert not newhc,newhc
packages=[p for r in z['Results'] for p in r.get('Packages',[])];assert any(p['Name']==m['dependency'] and p['Version']==m['version'] for p in packages)
def native(ref):
 name='maintenance-xnet-native-'+key;env={'PORT':'3000'} if key=='rimgo' else {'PORT':'8080','APP_URL':'https://overflow.utilibre.org','GIN_MODE':'release','DISABLE_RATELIMIT':'true','SCRAPER':'api','JWT_SIGNING_SECRET':secrets.token_hex(32)}
 paths=['/about','/privacy','/static/app.css','/favicon.ico'] if key=='rimgo' else ['/']
 try:
  run('docker','run','-d','--name',name,'--network','none','--read-only','--memory','512m','--cpus','1','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=32m,mode=1777',*[a for k,v in env.items() for a in ['-e',k+'='+v]],ref)
  def get(path):return run('docker','exec',name,'wget','-qO-','http://127.0.0.1:'+env['PORT']+path,stderr=subprocess.PIPE)
  for n in range(30):
   try:get(paths[0]);break
   except subprocess.CalledProcessError:
    if n==29:raise
    time.sleep(.2)
  return [{'path':p,'sha256':hashlib.sha256(get(p)).hexdigest()} for p in paths]
 finally:run('docker','rm','-f',name)
native_old,native_new=native(s['base']),native(image);assert native_old==native_new
if combined:
 for ref in [s['base'],image]:
  out=run('docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--log-driver','none','-v',str(ROOT.parent/'zlib/fixture/native')+':/native:ro','--entrypoint','/native',ref);assert out.strip()==b'ZLIB_NATIVE_PASSED checks=7'
 assert not any(f[0]=='CVE-2026-85091' for f in fz)

report={**b,'candidate':candidate,'imageId':image,'compositionBase':image_base,'zlibOverlayProven':combined,'configurationUnchanged':True,'changedFiles':delta,'scopeBase':image_base,'unchangedFiles':len(after)-len(delta),'nativeRoutes':native_new,'nativeResponseParity':True,'network':'none','scanDatabaseSha256':sha('/var/cache/utilibre-security/db/trivy.db'),'removedFindings':sorted(fa-fz),'newFindings':sorted(fz-fa),'newHighCritical':len(newhc),'retainedCounts':dict(collections.Counter(x[3] for x in fz)),'deployed':False,'limitations':'Native static route and existing source/privacy tests; no live provider search or real-user data accessed.'}
(d/'candidate.json').write_text(json.dumps(report,indent=2)+'\n');print(key+': binary-only runtime delta, native routes and frozen scan passed')

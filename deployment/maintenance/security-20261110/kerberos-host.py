"""Finite unloaded host-library update. No service restart, boot or user-data work.

Reuse the reviewed packages and ordinary fixture. Preparation must pass first;
apply rechecks exact inputs, active mappings, rollback files and package scope.
"""
import hashlib,json,os,subprocess,sys,tempfile,shutil,tarfile,io,atexit
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
assert sys.argv[1:] in [['prepare'],['apply']]
apply=sys.argv[1]=='apply'
lock=Path('/var/lib/utilibre-maintenance/package-release.lock')
with lock.open('x') as f:f.write(json.dumps({'pid':os.getpid(),'startedAt':datetime.now(timezone.utc).isoformat()})+'\n')
lock_identity=lock.stat().st_ino
def unlock():
 assert lock.stat().st_ino==lock_identity;lock.unlink()
atexit.register(unlock)
root=Path('/var/lib/utilibre-maintenance/security-20261110')
out=root/'kerberos/host';out.mkdir(exist_ok=True)
inputs=json.loads(Path(__file__).with_name('kerberos-inputs.json').read_text())
assert inputs['upstreamVersion']=='1.22.3'
assert inputs['source']['sha256']=='fe90af8441ad9fa9b064b8e53077cefb782a96f8a68276b031dc54af1789ff0b'
assert json.loads((root/'kerberos/trixie/output/realm.json').read_text())['passed']
names=['libgssapi-krb5-2','libk5crypto3','libkrb5-3','libkrb5support0']
sha=lambda data:hashlib.sha256(data).hexdigest()
def run(args,**kw):
 p=subprocess.run(args,capture_output=True,timeout=90,**kw)
 if p.returncode:raise RuntimeError(str(args[:2])+': '+p.stderr.decode(errors='replace')[-1500:])
 return p.stdout
def no_resident():
 ns=os.readlink('/proc/1/ns/mnt')
 for p in Path('/proc').glob('[0-9]*'):
  try:
   if os.readlink(p/'ns/mnt')!=ns:continue
   assert not any(x in (p/'maps').read_text() for x in ['/libkrb5.','/libgssapi_krb5.','/libk5crypto.','/libkrb5support.']),'Host consumer active; do not install'
  except (FileNotFoundError,ProcessLookupError):pass
def invariant():
 packages=run(['dpkg-query','-W','-f=${Package}=${Version}\n']).decode().splitlines()
 return {'otherPackages':sorted(x for x in packages if x.split('=')[0] not in names),'servicePids':run(['systemctl','show','docker.service','ssh.service','qemu-guest-agent.service','-p','Id','-p','MainPID']).decode(),'containerIds':sorted(run(['docker','ps','-q','--no-trunc','--filter','label=com.docker.compose.project']).decode().splitlines())}
def payload(archive,verify=False):
 entries=[]
 with tarfile.open(fileobj=io.BytesIO(run(['dpkg-deb','--fsys-tarfile',str(archive)]))) as tar:
  for m in tar:
   name='/'+m.name.removeprefix('./');assert '..' not in Path(name).parts
   if m.isfile():
    value=sha(tar.extractfile(m).read());kind='file'
    if verify:assert sha(Path(name).read_bytes())==value,'Payload mismatch: '+name
   elif m.issym():
    value=m.linkname;kind='symlink'
    if verify:assert os.readlink(name)==value
   else:assert m.isdir();continue
   entries.append({'path':name,'type':kind,'value':value})
 return entries
old=json.loads((root/'kerberos/trixie/output/rollback/authenticated.json').read_text())['packages']
rows=[]
assert run(['dpkg','--audit'])==b'';no_resident()
for name in names:
 rollback=next(p for p in old if p['package']==name);pin=inputs['packages']['trixie-'+name]
 assert sha(Path(rollback['file']).read_bytes())==rollback['sha256']
 candidate=root/'debian-acquisition'/pin['file'];assert sha(candidate.read_bytes())==pin['sha256']
 assert run(['dpkg-query','-W','-f=${Version}',name]).decode()==rollback['version']
 rows.append({'package':name,'old':rollback,'new':{**pin,'path':str(candidate)},'oldPayload':payload(rollback['file'],True),'newPayload':payload(candidate)})
assert not (out/'release.json').exists(),'Preserve existing receipt'
assert os.statvfs('/').f_bavail*os.statvfs('/').f_frsize>8*1024**3
before=invariant()
with tempfile.TemporaryDirectory(prefix='kerberos-host-') as tmp:
 t=Path(tmp);t.chmod(0o755);(t/'new').mkdir()
 for row in rows:run(['dpkg-deb','-x',row['new']['path'],str(t/'new')])
 run(['chmod','-R','a+rX',str(t/'new')])
 native=root/'vendor-debian/kerberos-native';assert sha(native.read_bytes())==inputs['fixture']['binarySha256']
 shutil.copyfile(native,t/'native');(t/'native').chmod(0o755)
 def check(state):
  lib=str(t/'new/usr/lib/x86_64-linux-gnu') if state=='new' else '/usr/lib/x86_64-linux-gnu'
  result=run(['unshare','--net','prlimit','--core=0','--as=268435456','--cpu=20','--','runuser','-u','nobody','--','env','-i','PATH=/usr/bin:/bin','LD_LIBRARY_PATH='+lib,str(t/'native')])
  assert result.strip()==b'KERBEROS_NATIVE_PASSED checks=15'
  return {'passed':True,'checks':15,'network':'none','uid':65534}
 # Inspect all host package ELF consumers, excluding only the replaced libraries.
 excluded={str(Path(e['path']).resolve()) for r in rows for e in r['oldPayload'] if e['path'].startswith('/usr/lib/')}
 helpers={b'krb5int_utf8_next',b'gss_krb5int_unseal_token_v3'};consumers=[]
 for base in ['/usr/bin','/usr/sbin','/usr/lib','/usr/local/bin','/usr/local/lib']:
  for p in Path(base).rglob('*'):
   if p.is_symlink() or not p.is_file() or str(p.resolve()) in excluded:continue
   with p.open('rb') as f:
    if f.read(4)!=b'\x7fELF':continue
   data=p.read_bytes();assert not any(h in data for h in helpers),'Removed helper used by '+str(p)
   consumers.append({'path':str(p),'sha256':sha(data)})
 assert consumers
 simulation=run(['apt-get','--simulate','--no-install-recommends','install',*[r['new']['path'] for r in rows]]).decode()
 assert sorted(l.split()[1] for l in simulation.splitlines() if l.startswith('Inst '))==sorted(names)
 assert not any(l.startswith('Remv ') for l in simulation.splitlines())
 check('old');native_result=check('new');no_resident();assert invariant()==before
 common={'rows':rows,'before':before,'consumers':consumers,'fixtureSha256':sha(Path(__file__).read_bytes()),'native':native_result}
 if not apply:
  (out/'prepared.json').write_text(json.dumps({'date':datetime.now(timezone.utc).isoformat(),'status':'prepared-not-deployed',**common,'simulation':simulation},indent=2)+'\n')
  print('Host candidate, rollback, installed-consumer and native checks passed; not deployed.')
 else:
  prepared=json.loads((out/'prepared.json').read_text());assert prepared['status']=='prepared-not-deployed'
  assert (datetime.now(timezone.utc)-datetime.fromisoformat(prepared['date'])).total_seconds()<1800
  for k,v in common.items():assert prepared[k]==v,'Preparation changed: '+k
  report={'date':datetime.now(timezone.utc).isoformat(),'status':'applying',**common}
  def save():(out/'release.json').write_text(json.dumps(report,indent=2)+'\n')
  save()
  try:
   no_resident();(out/'install.log').write_bytes(run(['dpkg','--force-confold','--install',*[r['new']['path'] for r in rows]]))
   for r in rows:
    assert run(['dpkg-query','-W','-f=${Version}',r['package']]).decode()==r['new']['version'];payload(r['new']['path'],True)
   check('live');no_resident();assert invariant()==before;assert run(['dpkg','--audit'])==b''
   report.update(status='passed',noServiceRestart=True,completedAt=datetime.now(timezone.utc).isoformat());save()
  except Exception as e:
   report.update(status='failed',error=str(e));save()
   no_resident();(out/'rollback.log').write_bytes(run(['dpkg','--force-confold','--install',*[r['old']['file'] for r in rows]]))
   for r in rows:payload(r['old']['file'],True)
   assert invariant()==before;report['rollback']='Exact old payload restored';save();raise
  print('Host Kerberos updated; no service restarted, container IDs unchanged.')

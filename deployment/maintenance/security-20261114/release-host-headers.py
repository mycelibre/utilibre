"""Install one authenticated UAPI-header package; no executable/service changes."""
import os,json,hashlib,subprocess,tempfile,lzma,urllib.request
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/security-20261114/headers');pool=r/'debian-acquisition';out=r/'host';out.mkdir(exist_ok=True);sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(a):return subprocess.check_output(a,text=True,stderr=subprocess.PIPE,timeout=120).strip()
old='6.12.116-1';new='6.12.117-1';key='linux-libc-dev';receipt=out/'release.json'
assert not receipt.exists(),'Retain existing release evidence'
proof=json.load(open(pool/'authenticated.json'));p=proof['packages']['trixie/linux-libc-dev'];assert p['version']==new
# Reuse the authenticated saved index, not an unauthenticated rollback URL.
index=pool/'trixie-security/Packages.xz';assert sha(index)==next(x['packagesSha256'] for x in proof['indexes'] if x['distribution']=='trixie-security')
block=next(b for b in lzma.decompress(index.read_bytes()).decode().split('\n\n') if b.startswith('Package: linux-libc-dev\n') and '\nVersion: '+old+'\n' in b);fields=dict(l.split(': ',1) for l in block.splitlines() if l and not l[0].isspace() and ': ' in l)
archive=out/Path(fields['Filename']).name
if not archive.exists():
 with urllib.request.urlopen('https://deb.debian.org/debian-security/'+fields['Filename'],timeout=30) as s:data=s.read(4*1024**2)
 assert hashlib.sha256(data).hexdigest()==fields['SHA256'];archive.write_bytes(data)
assert sha(archive)==fields['SHA256'];candidate=pool/p['file'];assert sha(candidate)==p['sha256'];assert run(['dpkg-query','-W','-f=${Version}',key])==old
assert run(['dpkg','--audit'])==''
compileproof=json.load(open(r/'vendor-debian/linkding-linkding/application.json'));assert compileproof['passed'] and compileproof['headerCompilation']
def inventory():return sorted(l for l in run(['dpkg-query','-W','-f=${binary:Package}=${Version}\n']).splitlines() if not l.startswith(key+'='))
def pids():return run(['systemctl','show','docker.service','ssh.service','qemu-guest-agent.service','dbus.service','-p','Id','-p','MainPID'])
def inspect(archive,directory):
 run(['dpkg-deb','--raw-extract',str(archive),str(directory)]);assert set(x.name for x in (directory/'DEBIAN').iterdir())<=set(['control','md5sums'])
 records={}
 for f in directory.rglob('*'):
  if 'DEBIAN' in f.relative_to(directory).parts:continue
  if f.is_symlink():records['/'+str(f.relative_to(directory))]={'link':os.readlink(f)}
  elif f.is_file():
   assert f.read_bytes()[:4]!=b'\x7fELF';records['/'+str(f.relative_to(directory))]={'sha256':sha(f)}
 return records
def exact(records):
 for path,v in records.items():
  f=Path(path)
  if 'link' in v:assert f.is_symlink() and os.readlink(f)==v['link'],path
  else:assert sha(f)==v['sha256'],path
with tempfile.TemporaryDirectory(prefix='utilibre-host-headers-',dir='/dev/shm') as temp:
 before=inspect(archive,Path(temp)/'old');after=inspect(candidate,Path(temp)/'new');exact(before)
 sim=run(['apt-get','--simulate','install',str(candidate)]);assert [l.split()[1] for l in sim.splitlines() if l.startswith('Inst ')]==[key];assert not any(l.startswith('Remv ') for l in sim.splitlines())
 packages=inventory();services=pids();report={'date':datetime.now(timezone.utc).isoformat(),'status':'prepared','old':old,'new':new,'oldArchiveSha256':sha(archive),'newArchiveSha256':sha(candidate),'compilerProofSha256':sha(r/'vendor-debian/linkding-linkding/application.json'),'before':before,'after':after,'noElfPayload':True,'servicePids':services,'productionChanged':False}
 def save():receipt.write_text(json.dumps(report,indent=2)+'\n')
 save()
 try:
  run(['dpkg','--install',str(candidate)]);exact(after);assert run(['dpkg-query','-W','-f=${Version}',key])==new;assert run(['dpkg','--audit'])=='';assert inventory()==packages;assert pids()==services
  report.update(status='passed',completedAt=datetime.now(timezone.utc).isoformat(),productionChanged=True,noServiceRestart=True);save()
 except Exception:
  report['status']='failed';run(['dpkg','--install',str(archive)]);exact(before);assert inventory()==packages and pids()==services;report['rollback']='verified';save();raise
print('Host headers updated; exact payload, other packages and service PIDs verified')

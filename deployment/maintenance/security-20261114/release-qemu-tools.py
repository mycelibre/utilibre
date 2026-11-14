"""Repackage/install only QEMU block tools; never touch the guest agent or VM disks."""
import os,json,hashlib,subprocess,shutil,sys
from pathlib import Path
from datetime import datetime,timezone
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/qemu/native');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(a):return subprocess.check_output(a,text=True,stderr=subprocess.PIPE,timeout=120).strip()
assert sys.argv[1:] in (['prepare'],['apply']);spec=json.loads((h.parent/'security-20261028/qemu-inputs.json').read_text());old=Path('/var/lib/utilibre-maintenance/security-20261028/qemu-native')/spec['packages']['qemu-utils']['file'];assert sha(old)==spec['packages']['qemu-utils']['sha256'];b=json.load(open(r/'build.json'));n=json.load(open(r/'native-check.json'));assert b['passed'] and n['passed'];assert n['records'][1]['binaries']==b['binaries'];assert n['records'][0]['formats']==n['records'][1]['formats'] and n['records'][0]['commands']==n['records'][1]['commands']
for name,digest in b['binaries'].items():assert sha(r/name)==digest;assert 'not found' not in run(['ldd',str(r/name)]);assert run([str(r/name),'--version'])
def manifest(d):return {'/'+str(f.relative_to(d)):({'link':os.readlink(f)} if f.is_symlink() else {'sha256':sha(f)})|{'mode':f.lstat().st_mode&0o777} for f in d.rglob('*') if (f.is_file() or f.is_symlink()) and 'DEBIAN' not in f.relative_to(d).parts}
def exact(rows):
 for p,v in rows.items():
  f=Path(p);assert f.lstat().st_mode&0o777==v['mode']
  if 'link' in v:assert f.is_symlink() and os.readlink(f)==v['link']
  else:assert sha(f)==v['sha256'],p
oldversion=spec['version'];newversion=oldversion+'+utilibre1';pkg=r/'qemu-utils.deb'
if sys.argv[1]=='prepare':
 d=r/'package';assert not d.exists();run(['dpkg-deb','--raw-extract',str(old),str(d)]);before=manifest(d);exact(before);assert set(f.name for f in (d/'DEBIAN').iterdir())<=set(['control','md5sums','triggers'])
 for name in b['binaries']:shutil.copyfile(r/name,d/'usr/bin'/name);(d/'usr/bin'/name).chmod(0o755)
 c=d/'DEBIAN/control';text=c.read_text();assert text.count('\nVersion: '+oldversion+'\n')==1;c.write_text(text.replace('\nVersion: '+oldversion+'\n','\nVersion: '+newversion+'\n'));s=d/'DEBIAN/md5sums';lines=[]
 for f in d.rglob('*'):
  if f.is_file() and not f.is_symlink() and 'DEBIAN' not in f.relative_to(d).parts:lines.append(hashlib.md5(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(d)))
 s.write_text('\n'.join(sorted(lines))+'\n');after=manifest(d);assert set(before)==set(after);assert sorted(k for k in before if before[k]!=after[k])==sorted('/usr/bin/'+n for n in b['binaries']);run(['dpkg-deb','--root-owner-group','-Zxz','--build',str(d),str(pkg)]);sim=run(['apt-get','--simulate','install',str(pkg)]);assert [l.split()[1] for l in sim.splitlines() if l.startswith('Inst ')]==['qemu-utils'];assert not any(l.startswith('Remv ') for l in sim.splitlines())
 (r/'package.json').write_text(json.dumps({'passed':True,'archive':str(old),'archiveSha256':sha(old),'package':str(pkg),'packageSha256':sha(pkg),'oldVersion':oldversion,'newVersion':newversion,'before':before,'after':after,'onlyFourToolsChanged':True,'simulation':sim},indent=2)+'\n');print('QEMU utils package prepared; no dependency or guest-agent changes');sys.exit()
p=json.load(open(r/'package.json'));assert p['passed'];assert sha(pkg)==p['packageSha256'];assert run(['dpkg-query','-W','-f=${Version}','qemu-utils'])==oldversion;exact(p['before']);receipt=r/'release.json';assert not receipt.exists()
for pid in Path('/proc').iterdir():
 if pid.name.isdecimal():
  try:
   if (pid/'comm').read_text().strip() in ('qemu-img','qemu-io','qemu-nbd','qemu-storage-da'):assert 'docker' in (pid/'cgroup').read_text(),'Active host block tool: postpone update'
  except FileNotFoundError:pass
def inv():return sorted(l for l in run(['dpkg-query','-W','-f=${binary:Package}=${Version}\n']).splitlines() if not l.startswith('qemu-utils='))
def services():return run(['systemctl','show','qemu-guest-agent.service','ssh.service','docker.service','-p','Id','-p','MainPID'])
packages=inv();pids=services();ga=sha(Path('/usr/sbin/qemu-ga'));assert run(['dpkg','--audit'])=='';report={'date':datetime.now(timezone.utc).isoformat(),'status':'prepared','packageSha256':p['packageSha256'],'nativeProofSha256':sha(r/'native-check.json'),'oldVersion':oldversion,'newVersion':newversion,'services':pids,'guestAgentSha256':ga}
def save():receipt.write_text(json.dumps(report,indent=2)+'\n')
save()
try:
 run(['dpkg','--install',str(pkg)]);exact(p['after']);assert inv()==packages and services()==pids and sha(Path('/usr/sbin/qemu-ga'))==ga;assert run(['dpkg','--audit'])=='';run(['python3',str(h.parents[2]/'scripts/maintenance-update-policy.py'),'--write-unattended-blacklist']);report.update(status='passed',completedAt=datetime.now(timezone.utc).isoformat(),noServiceRestart=True);save()
except Exception:
 run(['dpkg','--install',str(old)]);exact(p['before']);assert inv()==packages and services()==pids;report.update(status='failed',rollback='verified');save();raise
print('QEMU block-tools repair installed; guest agent, other packages and service PIDs unchanged')

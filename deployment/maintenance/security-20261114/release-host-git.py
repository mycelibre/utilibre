"""Verified native Git package and synthetic compatibility; no service restart."""
from pathlib import Path
import os,json,subprocess,tempfile,shutil,hashlib
from datetime import datetime,timezone
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/git');p=json.load(open(r/'package.json'));b=json.load(open(r/'build.json'));sha=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();assert p['passed'] and b['passed'];assert sha(Path(p['package']))==p['sha256'];assert sha(Path(p['vendor']['archive']))==p['vendor']['sha256'];receipt=r/'host-release.json';assert not receipt.exists()
def run(a,**kw):return subprocess.check_output(a,text=True,stderr=subprocess.PIPE,timeout=180,**kw).strip()
def inventory():return sorted(l for l in run(['dpkg-query','-W','-f=${binary:Package}=${Version}\n']).splitlines() if not l.startswith('git='))
def pids():return run(['systemctl','show','docker.service','ssh.service','qemu-guest-agent.service','-p','Id','-p','MainPID'])
def manifest(d):return {'/'+str(f.relative_to(d)):({'link':os.readlink(f)} if f.is_symlink() else {'sha256':sha(f)})|{'mode':f.lstat().st_mode&0o777} for f in d.rglob('*') if (f.is_file() or f.is_symlink()) and 'DEBIAN' not in f.relative_to(d).parts}
def exact(rows):
 for name,v in rows.items():
  f=Path(name);assert f.lstat().st_mode&0o777==v['mode']
  if 'link' in v:assert os.readlink(f)==v['link'],name
  else:assert sha(f)==v['sha256'],name
with tempfile.TemporaryDirectory(prefix='utilibre-host-git-') as temp:
 d=Path(temp);d.chmod(0o755);run(['dpkg-deb','--raw-extract',p['vendor']['archive'],str(d/'old')]);before=manifest(d/'old');exact(before);run(['dpkg-deb','--raw-extract',p['package'],str(d/'new')]);after=manifest(d/'new');(d/'new').chmod(0o755)
 fixture=h.parent/'releases-20261112/git/native-git.sh';(d/'fixture.sh').write_bytes(fixture.read_bytes());(d/'fixture.sh').chmod(0o644)
 for base in [Path('/usr'),d/'new/usr']:
  env={**os.environ,'PATH':str(base/'bin')+':/usr/bin:/bin','GIT_EXEC_PATH':str(base/'lib/git-core'),'GIT_TEMPLATE_DIR':str(base/'share/git-core/templates'),'HOME':'/tmp'}
  result=run(['unshare','--net','--','setpriv','--reuid=65534','--regid=65534','--clear-groups','--no-new-privs','sh',str(d/'fixture.sh')],env=env);assert result.endswith('GIT_NATIVE_COMPATIBILITY_PASSED')
 assert run(['dpkg-query','-W','-f=${Version}','git'])==p['vendor']['version'];assert run(['dpkg','--audit'])=='';sim=run(['apt-get','--simulate','install',p['package']]);assert [l.split()[1] for l in sim.splitlines() if l.startswith('Inst ')]==['git'];assert not any(l.startswith('Remv ') for l in sim.splitlines());packages=inventory();services=pids();report={'date':datetime.now(timezone.utc).isoformat(),'status':'prepared','packageSha256':p['sha256'],'sourceSha256':b['sourceSha256'],'fixtureSha256':sha(fixture),'oldVersion':p['vendor']['version'],'version':p['version'],'nativeOldNewPassed':True,'upstreamTests':b['upstreamTests'],'servicePids':services}
 def save():receipt.write_text(json.dumps(report,indent=2)+'\n')
 save()
 try:
  run(['dpkg','--install',p['package']]);exact(after);assert run(['git','--version'])=='git version 2.54.1';assert run(['dpkg','--audit'])=='';assert inventory()==packages and pids()==services;run(['python3',str(h.parents[2]/'scripts/maintenance-update-policy.py'),'--write-unattended-blacklist']);report.update(status='passed',completedAt=datetime.now(timezone.utc).isoformat(),noServiceRestart=True);save()
 except Exception:
  run(['dpkg','--install',p['vendor']['archive']]);exact(before);assert inventory()==packages and pids()==services;report.update(status='failed',rollback='verified');save();raise
print('Host Git 2.54.1 installed; native workflows, unrelated packages and services preserved')

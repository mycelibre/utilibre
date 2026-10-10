"""Disposable network-none native restore; never mounts live quiz data."""
from pathlib import Path
import subprocess,tarfile,hashlib,os,json,shutil,time,sys
here=Path(__file__).resolve().parent;r=Path('/opt/utilibre/reports/new-services-20261009');backup=Path(sys.argv[1]);stage=r/'razzia-restore';assert not stage.exists();stage.mkdir(mode=0o700)
for line in (backup/'SHA256SUMS').read_text().splitlines():
 digest,name=line.split();assert hashlib.sha256((backup/name).read_bytes()).hexdigest()==digest
with tarfile.open(backup/'config-private.tar.gz') as a:a.extractall(stage,filter='data')
for p in [stage,*stage.rglob('*')]:os.chown(p,1000,1000)
bundle=r/'razzia-restored-test.cjs'
subprocess.run(['/opt/utilibre/calendar-src/razzia/packages/socket/node_modules/.bin/esbuild',str(here/'check-restored.mjs'),'--bundle','--platform=node','--format=cjs','--outfile='+str(bundle)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
name='utilibre-razzia-restore'
try:
 subprocess.run(['docker','run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','256m','--cpus','1','--pids-limit','96','--tmpfs','/tmp:size=16m,mode=1777','-v',str(stage/'config')+':/app/config','utilibre-razzia:3.1.0-p1'],check=True,stdout=subprocess.DEVNULL)
 for src,dest in [(bundle,'/tmp/check.cjs'),(r/'razzia-check-state.json','/tmp/fixture.json')]:
  with src.open('rb') as inp:subprocess.run(['docker','exec','-i',name,'sh','-c','cat > '+dest],stdin=inp,check=True)
 check=subprocess.run(['docker','exec',name,'node','/tmp/check.cjs'],check=True,capture_output=True,text=True)
 result=json.loads(check.stdout);result.update(backup=str(backup),checksums=True);(r/'razzia-restore.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
finally:
 subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);shutil.rmtree(stage)

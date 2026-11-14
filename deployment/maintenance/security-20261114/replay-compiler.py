"""Replay archived compiler inputs offline; never resolve newer dependencies."""
import hashlib,json,os,shutil,subprocess,sys,tempfile
from pathlib import Path
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114')
assert len(sys.argv)==3 and sys.argv[1] in ('check','build')
s=next(x for x in json.loads((h/'compiler-inputs.json').read_text())['rows'] if x['name']==sys.argv[2])
def sha(p):
 with p.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
d=r/s['name'];assert sha(d/'inputs.json')==s['inputSha256']
for f in s['input']['archives']:
 p=d/'archives'/f['file'];assert p.name==f['file'] and sha(p)==f['sha256'] and p.stat().st_size==f['bytes']
if sys.argv[1]=='check':
 print(s['name']+': archived compiler checksums passed');sys.exit(0)
assert shutil.disk_usage(d).free>=8*1024**3
assert subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',s['input']['base']],text=True).strip()==s['input']['base']
with tempfile.TemporaryDirectory(prefix='compiler-replay-',dir=d) as work:
 for f in s['input']['archives']:
  p=Path(work)/f['file'];shutil.copyfile(d/'archives'/f['file'],p);p.chmod(0o644)
 (Path(work)/'Dockerfile').write_text(s['dockerfile'])
 tag='utilibre-'+s['name']+':nov14-archived-replay'
 with (d/'replay-build.log').open('wb') as log:
  p=subprocess.run(['docker','build','--network','none','--pull=false','--memory','1g','--cpu-period','100000','--cpu-quota','100000','-t',tag,work],stdout=log,stderr=log,timeout=600,env={**os.environ,'DOCKER_BUILDKIT':'0'})
 assert p.returncode==0,'Private replay-build.log retained'
 image=subprocess.check_output(['docker','image','inspect','--format','{{.Id}}',tag],text=True).strip()
 (d/'replay.json').write_text(json.dumps({'passed':True,'imageId':image,'recordedImage':s['builtImage'],'sameImageBytes':image==s['builtImage'],'network':'none','deployed':False},indent=2)+'\n')
 print('Archived compiler prepared; no production activation or byte-identity assumption')

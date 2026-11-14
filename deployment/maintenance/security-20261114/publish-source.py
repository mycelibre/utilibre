"""Finite corresponding-source offer; explicit inputs, no runtime/config data.

prepare writes a verified private archive. publish exposes that same archive on
existing source mounts, preserving all older offers. No service restart.
"""
import argparse, hashlib, io, json, os, tarfile, tempfile
from pathlib import Path
H=Path(__file__).resolve().parent
ROOT=H.parents[2]
R=Path('/var/lib/utilibre-maintenance/security-20261114')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
NAME='security-native-20261114-source.tar.gz'
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('mode',choices=['prepare','publish'])
a=parser.parse_args()
os.umask(0o077)
entries={}
def add(path,name,digest=None):
 path=Path(path)
 assert path.is_file() and not path.is_symlink() and path.stat().st_size<80*1024**2
 assert not Path(name).is_absolute() and '..' not in Path(name).parts and name not in entries
 actual=sha(path)
 if digest:assert actual==digest, name
 entries[name]={'path':path,'sha256':actual,'bytes':path.stat().st_size}
add('/var/lib/utilibre-maintenance/git-vendor-20261112/source/git-2.54.1.tar.xz','upstream/git/git-2.54.1.tar.xz','ca988eb9af7d8770339df7cdc38106fec8244664ff886840767cb9be3ef0e16c')
q=read(H.parent/'security-20261103/qemu-components.json')
for f in q['files']:
 add('/var/lib/utilibre-maintenance/security-20261103/remaining/qemu-components/'+f['file'],'upstream/qemu/'+f['file'],f['sha256'])
add(R/'qemu/68df2cefcfe6eb3df4c0531cea4d9125742bc9df.patch','patches/qemu/68df2cefcfe6eb3df4c0531cea4d9125742bc9df.patch','1c80743b9d52d6da0cb5589e11335652d33ff2d234dc179259f40cffaecfaeb4')
for row in read(H/'xserver-source-inputs.json')['rows']:
 for f in row['archives']:add(Path(row['dir'])/f['file'],'upstream/xserver/'+row['role']+'/'+f['file'],f['sha256'])
for f in read(H/'xserver-inputs.json')['patches']:add(R/'xserver'/f['file'],'patches/xserver/'+f['file'],f['sha256'])
for cve in ('88812','93521','93523'):
 name='CVE-2026-'+cve+'.patch'
 add('/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012/output/'+name,'patches/xserver/retained/'+name)
for f in sorted(H.iterdir()):
 if f.is_file() and f.suffix in ('.py','.mjs','.json','.md','.sh','.c','.patch'):
  if f.name=='status.json':continue # operational report, not build input
  add(f,'integration/deployment/maintenance/security-20261114/'+f.name)
for rel in ('deployment/maintenance/xvfb-single-screen-final/build.mk','deployment/maintenance/security-20261103/qemu-components.json','deployment/maintenance/security-20261109/zlib-check.py','LICENSE'):
 add(ROOT/rel,'integration/'+rel)
source_manifest={n:{k:v for k,v in d.items() if k!='path'} for n,d in sorted(entries.items())}
manifest={'schemaVersion':1,'purpose':'Complete upstream source, retained patches and finite build recipes for the 14 November Git, Xserver and QEMU repairs.','licenses':{'Git':'GPL-2.0-only','QEMU':'GPL-2.0 with component-specific notices in upstream source','Xserver':'MIT/X11 and component notices in each vendor source','Utilibre integration':'AGPL-3.0-or-later'},'entries':source_manifest}
output=R/NAME
if a.mode=='prepare':
 assert not output.exists(), 'Preserve the existing immutable offer; verify it instead'
 assert os.statvfs(R).f_bavail*os.statvfs(R).f_frsize>8*1024**3+80*1024**2
 fd,tmp=tempfile.mkstemp(prefix='source-offer-',suffix='.tar.gz',dir=R);os.close(fd)
 try:
  with tarfile.open(tmp,'w:gz',compresslevel=3) as tar:
   for name,d in sorted(entries.items()):
    info=tar.gettarinfo(str(d['path']),arcname=name)
    info.uid=info.gid=0;info.uname=info.gname='';info.mode=0o644;info.mtime=1794614400
    with d['path'].open('rb') as f:tar.addfile(info,f)
   data=(json.dumps(manifest,indent=2)+'\n').encode()
   info=tarfile.TarInfo('SOURCE-MANIFEST.json');info.size=len(data);info.mode=0o644;info.mtime=1794614400
   tar.addfile(info,io.BytesIO(data))
  with tarfile.open(tmp,'r:gz') as tar:
   names=tar.getnames();assert len(names)==len(entries)+1 and set(names)==set(entries)|{'SOURCE-MANIFEST.json'}
   for name,d in entries.items():assert hashlib.sha256(tar.extractfile(name).read()).hexdigest()==d['sha256']
  os.rename(tmp,output)
 except BaseException:
  Path(tmp).unlink(missing_ok=True);raise
 receipt={'passed':True,'file':NAME,'sha256':sha(output),'bytes':output.stat().st_size,'files':len(entries)+1,'manifest':manifest,'published':False}
 (R/'source-offer.json').write_text(json.dumps(receipt,indent=2)+'\n')
else:
 receipt=read(R/'source-offer.json');assert receipt['passed'] and sha(output)==receipt['sha256']
 assert receipt['manifest']==manifest, 'Source inputs changed; do not publish stale offer'
 for directory in ('/opt/utilibre/toolbox-public','/opt/utilibre/records/public'):
  target=Path(directory)/NAME;assert target.parent.is_dir()
  if target.exists():assert sha(target)==receipt['sha256']
  else:os.link(output,target)
 os.chmod(output,0o644)
 receipt['published']=True
 (R/'source-offer.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='manifest'}))

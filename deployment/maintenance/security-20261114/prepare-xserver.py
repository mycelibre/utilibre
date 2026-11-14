"""Repackage native Xvfb only, chain the previously verified one-screen payload."""
import os,json,hashlib,subprocess,shutil
from pathlib import Path
os.umask(0o077)
h=Path(__file__).resolve().parent;r=Path('/var/lib/utilibre-maintenance/security-20261114/xserver');old=Path('/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();records=[]
def run(a):return subprocess.check_output(a,text=True,stderr=subprocess.PIPE,timeout=180).strip()
def manifest(d):
 return {'/'+str(p.relative_to(d)):({'link':os.readlink(p)} if p.is_symlink() else {'sha256':sha(p)})|{'mode':p.lstat().st_mode&0o777} for p in d.rglob('*') if 'DEBIAN' not in p.relative_to(d).parts and (p.is_file() or p.is_symlink())}
for row in json.load(open(old/'packages.json'))['records']:
 role=row['role'];build=json.load(open(r/role/'build.json'));assert build['passed'] and build['nativeUpstreamCheckPassed'];assert '-DMAXSCREENS=1' in (r/role/'config.log').read_text();assert sha(Path(row['package']))==row['packageSha256'];assert sha(r/role/'Xvfb')==build['binarySha256']
 d=r/('package-'+role);assert not d.exists();run(['dpkg-deb','--raw-extract',row['package'],str(d)]);before=manifest(d);assert set(p.name for p in (d/'DEBIAN').iterdir())=={'control','md5sums'}
 oldversion=row['newVersion'];newversion=oldversion.removesuffix('+utilibre1')+'+utilibre2';c=d/'DEBIAN/control';s=c.read_text();assert s.count('\nVersion: '+oldversion+'\n')==1;c.write_text(s.replace('\nVersion: '+oldversion+'\n','\nVersion: '+newversion+'\n'))
 shutil.copyfile(r/role/'Xvfb',d/'usr/bin/Xvfb');(d/'usr/bin/Xvfb').chmod(0o755);m=d/'DEBIAN/md5sums';lines=m.read_text().splitlines();assert sum(l.endswith('  usr/bin/Xvfb') for l in lines)==1;m.write_text('\n'.join(hashlib.md5((d/'usr/bin/Xvfb').read_bytes()).hexdigest()+'  usr/bin/Xvfb' if l.endswith('  usr/bin/Xvfb') else l for l in lines)+'\n')
 after=manifest(d);assert set(before)==set(after);assert [k for k in before if before[k]!=after[k]]==['/usr/bin/Xvfb'];pkg=r/role/'xvfb.deb';run(['dpkg-deb','--root-owner-group','-Zxz','--build',str(d),str(pkg)])
 records.append({'role':role,'archive':row['package'],'archiveSha256':row['packageSha256'],'beforeVersion':oldversion,'newVersion':newversion,'package':str(pkg),'packageSha256':sha(pkg),'binarySha256':sha(r/role/'Xvfb'),'before':before,'after':after})
(r/'packages.json').write_text(json.dumps({'passed':True,'records':records,'productionChanged':False},indent=2)+'\n')
# Stage through the established upstream image adapter, fixed output and tag.
s=(h.parent/'xvfb-single-screen-final/stage.mjs').read_text().replace("xvfb-single-screen-final-20261012","security-20261114/xserver").replace("utilibre-penpot-exporter:2.18.3-single-screen-20261012","utilibre-penpot-exporter:2.18.3-xserver-20261114").replace("2.18.3-single-screen-base-20261012","2.18.3-xserver-20261114")
(r/'stage.mjs').write_text(s);(r/'output').mkdir(exist_ok=True)
for role in ('host','dhi'):shutil.copyfile(r/role/'Xvfb',r/'output'/('Xvfb-'+role));(r/'output'/('Xvfb-'+role)).chmod(0o755)
with (r/'stage.log').open('wb') as f:p=subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(r/'stage.mjs')],env={**os.environ,'DOCKER_BUILDKIT':'0'},stdout=f,stderr=f,timeout=240)
assert p.returncode==0,'Private stage log retained'
print('Native Xvfb package candidates and isolated exporter image prepared')

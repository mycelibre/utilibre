"""Native Git release in its existing Debian package; documentation stays separate."""
from pathlib import Path
import json,hashlib,subprocess,tarfile,os,shutil
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/security-20261114/git');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();b=json.load(open(r/'build.json'));assert b['passed'];assert sha(r/'git-runtime.tar.xz')==b['runtimeSha256'];vendor=json.load(open(r/'vendor-git.json'));assert sha(Path(vendor['archive']))==vendor['sha256'];out=r/'package';assert not out.exists();subprocess.run(['dpkg-deb','--raw-extract',vendor['archive'],str(out)],check=True,timeout=30)
# Select exactly the existing native Git subpackage: no git-svn, git-email,
# credential store or system configuration from separate optional packages.
with tarfile.open(r/'git-runtime.tar.xz') as t:
 members={m.name.removeprefix('./'):m for m in t if not m.isdir()};selected=[]
 for file in list(out.rglob('*')):
  rel=str(file.relative_to(out))
  if rel.startswith('DEBIAN/') or rel not in members:continue
  m=members[rel]
  if file.is_dir() and not file.is_symlink():continue
  file.unlink();file.parent.mkdir(parents=True,exist_ok=True)
  if m.issym():file.symlink_to(m.linkname)
  elif m.isfile():file.write_bytes(t.extractfile(m).read());file.chmod(m.mode)
  else:raise RuntimeError('Unsupported archive entry '+rel)
  selected.append(rel)
 # New native builtin aliases are links to the same Git executable, only in its own dir.
 for rel,m in members.items():
  if rel.startswith('usr/lib/git-core/') and '/' not in rel.removeprefix('usr/lib/git-core/') and m.issym() and m.linkname=='git' and not (out/rel).exists():
   (out/rel).symlink_to('git');selected.append(rel)
 assert 'usr/bin/git' in selected and 'usr/lib/git-core/git' in selected and 'usr/lib/git-core/git-remote-http' in selected
for f in out.rglob('*'):
 if f.is_file() and not f.is_symlink() and f.read_bytes()[:4]==b'\x7fELF':assert str(f.relative_to(out)) in selected,'Old native executable retained'
c=out/'DEBIAN/control';s=c.read_text();assert '\nVersion: '+vendor['version']+'\n' in s;s=s.replace('\nVersion: '+vendor['version']+'\n','\nVersion: 1:2.54.1+utilibre1\n');c.write_text(s)
sums=[]
for f in sorted(out.rglob('*')):
 if f.is_file() and not f.is_symlink() and 'DEBIAN' not in f.relative_to(out).parts:sums.append(hashlib.md5(f.read_bytes()).hexdigest()+'  '+str(f.relative_to(out)))
(out/'DEBIAN/md5sums').write_text('\n'.join(sums)+'\n');pkg=r/'git_2.54.1+utilibre1_amd64.deb';subprocess.run(['dpkg-deb','--root-owner-group','-Zxz','--build',str(out),str(pkg)],check=True,stdout=subprocess.DEVNULL,timeout=120)
(r/'package.json').write_text(json.dumps({'passed':True,'package':str(pkg),'sha256':sha(pkg),'version':'1:2.54.1+utilibre1','upstream':'2.54.1','vendor':vendor,'replaced':sorted(selected),'allNativeExecutablesUpdated':True,'gitManUnchanged':True,'limitation':'Existing Debian manual package retained; its documentation does not execute the affected Git operations.'},indent=2)+'\n');print('Native Git package prepared; all installed Git executables updated, optional subpackages excluded')

#!/usr/bin/env python3
"""Publish the two reviewed static single-file editions and corresponding source.
No services, user documents, backups, identity settings or shared index are changed.
"""
import gzip,hashlib,io,json,os,pathlib,shutil,subprocess,tarfile,tempfile,time
repo=pathlib.Path(__file__).resolve().parents[2]
public=pathlib.Path('/opt/utilibre/toolbox-public')
review=pathlib.Path('/opt/utilibre/reports/single-file-20261009')
assert json.loads((review/'core-results.json').read_text())['results'][-1]['unsafeEncryptionCreationDisabled']
assert json.loads((review/'wiki-results.json').read_text())['results'][-1]['nativeDeleteSaveReopen']
results=[]
for app,pin in [('one-file-core','b988be00cc35fe1a7d7756543b326287f2e4ebf5'),('tiddlywiki','d391595836e2aead565480763f9bf9eb52e29e75')]:
 source=pathlib.Path('/opt/utilibre/src')/app
 build=pathlib.Path('/opt/utilibre/build-'+app)
 manifest=json.loads((build/'build.json').read_text());assert manifest['upstream']==pin
 assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
 for name,digest in manifest['files'].items():assert hashlib.sha256((build/name).read_bytes()).hexdigest()==digest
 command=['git','-C',str(source),'archive','--format=tar','--prefix=upstream/',pin]
 if app=='one-file-core':command+=['LICENSE','README.md','changelog.md','import-export-save.md','keyboard-shortcuts.md','mobile-gestures.md','the-one-file.html']
 raw=subprocess.check_output(command)
 stage=pathlib.Path(tempfile.mkdtemp(prefix=app+'-source-',dir='/opt/utilibre'))
 archive=stage/(app+'-utilibre.tar.gz')
 with archive.open('wb') as rawout,gzip.GzipFile(filename='',fileobj=rawout,mode='wb',mtime=0) as zipped,tarfile.open(fileobj=zipped,mode='w') as target:
  with tarfile.open(fileobj=io.BytesIO(raw)) as upstream:
   for member in upstream:
    assert not member.name.startswith('/') and '..' not in pathlib.PurePosixPath(member.name).parts
    if member.issym():assert not member.linkname.startswith('/') and '..' not in pathlib.PurePosixPath(member.linkname).parts
    member.uid=member.gid=0;member.uname=member.gname='';member.mtime=0
    target.addfile(member,upstream.extractfile(member) if member.isfile() else None)
  files=sorted((repo/'deployment'/app).rglob('*'))+[repo/'docs'/f'{app}-deployment-2026-10-09.md',repo/'LICENSE']
  for file in files:
   assert not file.is_symlink()
   if not file.is_file():continue
   assert file.name not in ('.env','credentials.json')
   info=target.gettarinfo(str(file),'integration/'+str(file.relative_to(repo)));info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
   with file.open('rb') as stream:target.addfile(info,stream)
  data=(json.dumps(manifest,indent=2)+'\n').encode();info=tarfile.TarInfo('source-manifest.json');info.size=len(data);info.mode=0o644;target.addfile(info,io.BytesIO(data))
 digest=hashlib.sha256(archive.read_bytes()).hexdigest()
 # First deployment only. Updates require retaining the previous directory explicitly.
 destination=public/'apps'/app
 assert not destination.exists(),f'Existing {app}: preserve it before replacing'
 hidden=public/'apps'/('.'+app+'-staged');assert not hidden.exists()
 shutil.copytree(build,hidden)
 os.rename(hidden,destination)
 source_destination=public/(app+'-utilibre.tar.gz');assert not source_destination.exists()
 shutil.copyfile(archive,public/('.'+archive.name));os.rename(public/('.'+archive.name),source_destination)
 results.append({'id':app,'version':manifest['version'],'sha256':digest,'bytes':archive.stat().st_size,'url':'https://tools.utilibre.org/utilibre-source/'+archive.name+'?revision='+digest[:12]})
(review/'published-sources.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results))

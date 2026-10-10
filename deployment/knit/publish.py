#!/usr/bin/env python3
"""First-install only: two tested static apps and their corresponding free source."""
import gzip,hashlib,io,json,os,pathlib,shutil,subprocess,tarfile,tempfile
repo=pathlib.Path(__file__).resolve().parents[2]
public=pathlib.Path('/opt/utilibre/toolbox-public');review=pathlib.Path('/opt/utilibre/reports/knit-newton-20261009')
assert json.loads((review/'knit-results.json').read_text())['results'][-1]['fullUrlFreshContextRestore']
assert json.loads((review/'newton-results.json').read_text())['results'][-1]['nativeTournamentDeletion']
assert json.loads((review/'newton-import-boundary.json').read_text())['analyticsDatabaseRejected']
apps=[('knit','42be1d858273e2e1dad3c6b379a4219057b5176d',['src','index.html','package.json','package-lock.json','tsconfig.json','LICENSE','README.md']),('newton','226d6080ea40e1dcc67c628e355bc826a7848858',['tournament.html','js','css','lib','images/NewTon-logo.svg','LICENSE','THIRD-PARTY-LICENSES.md','README.md'])]
results=[]
for app,pin,paths in apps:
 source=pathlib.Path('/opt/utilibre/src')/app;build=pathlib.Path('/opt/utilibre/build-'+app)
 manifest=json.loads((build/'build.json').read_text());assert manifest['upstream']==pin
 for name,digest in manifest['files'].items():assert hashlib.sha256((build/name).read_bytes()).hexdigest()==digest
 raw=subprocess.check_output(['git','-C',str(source),'archive','--format=tar','--prefix=upstream/',pin,*paths])
 stage=pathlib.Path(tempfile.mkdtemp(prefix=app+'-source-',dir='/opt/utilibre'));archive=stage/(app+'-utilibre.tar.gz')
 with archive.open('wb') as rawout,gzip.GzipFile(filename='',fileobj=rawout,mode='wb',mtime=0) as gz,tarfile.open(fileobj=gz,mode='w') as out:
  with tarfile.open(fileobj=io.BytesIO(raw)) as upstream:
   for m in upstream:
    assert not m.name.startswith('/') and '..' not in pathlib.PurePosixPath(m.name).parts and not m.issym()
    assert not any(x in pathlib.PurePosixPath(m.name).parts for x in ['licensed','fonts','api'])
    m.uid=m.gid=0;m.uname=m.gname='';m.mtime=0;out.addfile(m,upstream.extractfile(m) if m.isfile() else None)
  for f in sorted((repo/'deployment'/app).rglob('*'))+[repo/'docs'/f'{app}-deployment-2026-10-09.md',repo/'LICENSE']:
   assert not f.is_symlink()
   if not f.is_file():continue
   assert f.name not in ['.env','credentials.json']
   info=out.gettarinfo(str(f),'integration/'+str(f.relative_to(repo)));info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
   with f.open('rb') as stream:out.addfile(info,stream)
  data=(json.dumps(manifest,indent=2)+'\n').encode();info=tarfile.TarInfo('source-manifest.json');info.size=len(data);info.mode=0o644;out.addfile(info,io.BytesIO(data))
 digest=hashlib.sha256(archive.read_bytes()).hexdigest()
 destination=public/'apps'/app;hidden=public/'apps'/('.'+app+'-staged')
 assert not destination.exists() and not hidden.exists(),f'Preserve existing {app} before updating'
 shutil.copytree(build,hidden);os.rename(hidden,destination)
 target=public/archive.name;assert not target.exists();shutil.copyfile(archive,public/('.'+archive.name));os.rename(public/('.'+archive.name),target)
 results.append({'id':app,'version':manifest['version'],'sha256':digest,'bytes':archive.stat().st_size,'url':'https://tools.utilibre.org/utilibre-source/'+archive.name+'?revision='+digest[:12]})
(review/'published-sources.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results))

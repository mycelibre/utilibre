#!/usr/bin/env python3
"""Publish pinned upstream source and explicit reviewed build/deployment files only."""
import gzip,hashlib,io,json,os,pathlib,shutil,subprocess,tarfile,tempfile
repo=pathlib.Path(__file__).resolve().parents[2];source=pathlib.Path('/opt/utilibre/src/planka-projects');pin='455aa274b44e63efa42840997ea4924b43eed533';report=pathlib.Path('/opt/utilibre/reports/projects-launch-20261009')
assert json.loads((report/'restore-check.json').read_text())['checks']
assert not json.loads((report/'browser-login.json').read_text())['errors']
ui=json.loads((report/'browser-ui.json').read_text());assert not ui['errors'] and not ui['externalResponses'];assert all(x in ['csp','net::ERR_BLOCKED_BY_CSP'] for x in ui['blockedRequests'])
assert 'Native helper soft-deleted two QA accounts' in (report/'app-retire.log').read_text()
files=[p for p in (repo/'deployment/projects').rglob('*') if p.is_file() and '__pycache__' not in p.parts]
files += [repo/'deployment/evaluation/projects'/n for n in ['Dockerfile','security-dependencies.patch','rebuild.sh','README.md']]
files += [repo/'docs/projects-deployment-2026-10-09.md',repo/'docs/projects-pilot-2026-10-09.md',repo/'docs/license-review.md',repo/'LICENSE']
manifest={'upstream':pin,'packageVersion':'1.3.0','localVersion':'1.3.0-455aa274-p2','releaseQualification':'Pinned main revision, not tagged 1.3.0 release','image':subprocess.check_output(['docker','image','inspect','utilibre-projects:455aa274-p2','--format','{{.Id}}'],text=True).strip(),'files':{str(p.relative_to(repo)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
raw=subprocess.check_output(['git','-C',str(source),'archive','--format=tar','--prefix=upstream/',pin])
with tempfile.TemporaryDirectory(prefix='projects-source-') as temporary:
 target=pathlib.Path(temporary)/'projects-utilibre.tar.gz'
 with target.open('wb') as output,gzip.GzipFile(filename='',fileobj=output,mode='wb',mtime=0) as compressed,tarfile.open(fileobj=compressed,mode='w') as archive:
  with tarfile.open(fileobj=io.BytesIO(raw)) as upstream:
   for member in upstream:
    assert not member.name.startswith('/') and '..' not in pathlib.PurePosixPath(member.name).parts
    member.uid=member.gid=0;member.uname=member.gname='';member.mtime=0;archive.addfile(member,upstream.extractfile(member) if member.isfile() else None)
  for p in sorted(files):
   assert not p.is_symlink() and p.suffix not in ['.env','.pyc'];info=archive.gettarinfo(str(p),'integration/'+str(p.relative_to(repo)));info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
   with p.open('rb') as stream:archive.addfile(info,stream)
  data=(json.dumps(manifest,indent=2)+'\n').encode();info=tarfile.TarInfo('source-manifest.json');info.size=len(data);info.mode=0o644;archive.addfile(info,io.BytesIO(data))
 digest=hashlib.sha256(target.read_bytes()).hexdigest();public=pathlib.Path('/opt/utilibre/toolbox-public');hidden=public/'.projects-utilibre.tar.gz';destination=public/'projects-utilibre.tar.gz'
 if destination.exists():
  previous=hashlib.sha256(destination.read_bytes()).hexdigest()
  if previous!=digest:
   history=report/'source-archive-history';history.mkdir(exist_ok=True)
   preserved=history/(previous+'.tar.gz')
   if not preserved.exists():shutil.copyfile(destination,preserved)
   assert hashlib.sha256(preserved.read_bytes()).hexdigest()==previous
 shutil.copyfile(target,hidden);os.chmod(hidden,0o644);os.replace(hidden,destination)
 result={'url':'https://tools.utilibre.org/utilibre-source/projects-utilibre.tar.gz?revision='+digest[:12],'sha256':digest,'bytes':target.stat().st_size,'upstream':pin,'image':manifest['image']}
 (report/'published-source.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

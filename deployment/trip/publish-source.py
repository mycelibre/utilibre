#!/usr/bin/env python3
"""Publish pinned upstream source and reviewed recipes, never runtime state."""
from pathlib import Path
import gzip,hashlib,json,os,shutil,subprocess,tarfile,tempfile
recipe=Path(__file__).resolve().parent
source=Path('/opt/utilibre/src/trip')
pin='856b1edfe81a735fce4b544c2e16a6518cebf164'
public=Path('/opt/utilibre/toolbox-public')
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()==pin
patches=['restricted.patch','dependencies.patch','rendering.patch']
subprocess.run(['git','apply','--reverse','--check',*[str(recipe/name) for name in patches]],cwd=source,check=True)
manifest={'application':'TRIP','version':'1.50.1-p2','license':'MIT','upstream':'https://github.com/itskovacs/trip','revision':pin,'image':subprocess.check_output(['docker','image','inspect','utilibre-trip:1.50.1-p2','--format','{{.Id}}'],text=True).strip(),'patches':{name:hashlib.sha256((recipe/name).read_bytes()).hexdigest() for name in patches}}
with tempfile.TemporaryDirectory(prefix='trip-source-',dir='/opt/utilibre') as temp:
 stage=Path(temp)
 subprocess.run(['git','archive','--format=tar','--prefix=trip/','--output',str(stage/'upstream.tar'),pin],cwd=source,check=True)
 subprocess.run(['tar','-xf',str(stage/'upstream.tar'),'-C',str(stage)],check=True)
 bundle=stage/'trip'/'utilibre';bundle.mkdir()
 shutil.copytree(recipe,bundle/'deployment'/'trip',ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
 shutil.copyfile(recipe.parents[1]/'docs/trip-review-2026-10-09.md',bundle/'trip-review.md')
 shutil.copyfile(recipe.parents[1]/'docs/trip-rendering-2026-10-09.md',bundle/'trip-rendering.md')
 (bundle/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 (bundle/'BUILD.txt').write_text('TRIP 1.50.1-p2, MIT. This archive contains exact upstream source, its licence, three separately removable source patches and complete deployment/build recipes. Apply restricted.patch, dependencies.patch and rendering.patch in that order in the trip source directory with git apply. For the guarded build scripts, clone the named upstream revision and run prepare.py before build.sh. The patched lock is reproduced by dependencies.patch. The supported Angular inlineCritical=false option preserves this instance CSP; the rendering patch also handles native absent-share metadata. The final image uses pinned upstream/Node images and hash-checked Pillow/pip wheels. See deployment/trip/README.md, trip-review.md and trip-rendering.md for limits, external providers, public rendering/update tests and recovery. No runtime secrets, account state, private test reports, unsent upstream-report draft or database backups are included.\n')
 output=stage/'trip-utilibre.tar.gz'
 with output.open('wb') as f,gzip.GzipFile(fileobj=f,mode='wb',mtime=0,filename='') as compressed,tarfile.open(fileobj=compressed,mode='w') as archive:
  for item in sorted((stage/'trip').rglob('*')):
   info=archive.gettarinfo(str(item),arcname=str(item.relative_to(stage)))
   info.uid=info.gid=0;info.uname=info.gname='';info.mtime=0
   if item.is_file():
    with item.open('rb') as data:archive.addfile(info,data)
   else:archive.addfile(info)
 manifest.update({'archive':'trip-utilibre.tar.gz','sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size})
 os.replace(output,public/'trip-utilibre.tar.gz')
 (public/'trip-utilibre.manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps(manifest,indent=2))

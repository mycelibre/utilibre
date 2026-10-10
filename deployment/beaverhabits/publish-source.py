#!/usr/bin/env python3
"""Publish clean pinned source, native patches and public recipes only."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tarfile,tempfile
root=Path(__file__).resolve().parents[2];recipe=root/'deployment/beaverhabits';source=Path('/opt/utilibre/community-src/beaverhabits');pin='4b3bc6d64548feb3c0a431d70f307be1117a820c'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
with tempfile.TemporaryDirectory(prefix='beaver-source-',dir='/opt/utilibre') as td:
 stage=Path(td);upstream=stage/'upstream.tar';subprocess.run(['git','-C',str(source),'archive','--format=tar','--output',str(upstream),pin],check=True)
 check=stage/'check';check.mkdir()
 with tarfile.open(upstream) as a:a.extractall(check,filter='data')
 subprocess.run(['git','-C',str(check),'apply',str(recipe/'upstream.patch')],check=True)
 for path in subprocess.check_output(['git','-C',str(source),'diff','--name-only'],text=True).splitlines():assert(check/path).read_bytes()==(source/path).read_bytes(),path
 archive=stage/'beaverhabits-utilibre.tar.gz'
 with tarfile.open(archive,'w:gz') as out,tarfile.open(upstream) as src:
  for item in src.getmembers():
   assert item.isfile() or item.isdir(),item.name
   stream=src.extractfile(item)if item.isfile()else None;item.name='upstream/'+item.name;out.addfile(item,stream)
  for p in sorted(list(recipe.iterdir())+[root/'docs/beaverhabits-deployment-2026-10-09.md']):
   assert p.is_file() and not p.is_symlink() and p.suffix not in ['.env','.key','.pem','.json']
   out.add(p,arcname=str(p.relative_to(root)),recursive=False)
 public=Path('/opt/utilibre/toolbox-public/beaverhabits-utilibre.tar.gz');shutil.copy2(archive,public.with_suffix('.tmp'));public.with_suffix('.tmp').replace(public);public.chmod(0o644)
 digest=hashlib.sha256(public.read_bytes()).hexdigest();print(json.dumps({'sha256':digest,'url':'https://tools.utilibre.org/utilibre-source/beaverhabits-utilibre.tar.gz?revision='+digest[:12],'pin':pin,'version':'0.10.0-p7'}))

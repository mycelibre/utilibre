#!/usr/bin/env python3
"""Publish only clean pinned sources and reproducible public deployment files."""
from pathlib import Path
import hashlib,json,shutil,subprocess,tarfile,tempfile
root=Path(__file__).resolve().parents[2];recipe=root/'deployment/donetick'
pins={'backend':('donetick','e88d8bea62405ca02288f93dd70efab8c0f1ff2c'),'frontend':('donetick-frontend','19c6a13dbfcfb7bc3110688554a45e29472a17b1')}
with tempfile.TemporaryDirectory(prefix='donetick-source-',dir='/opt/utilibre') as td:
 stage=Path(td)
 for kind,(name,pin) in pins.items():
  source=Path('/opt/utilibre/community-src')/name
  assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
  upstream=stage/(kind+'.tar');subprocess.run(['git','-C',str(source),'archive','--format=tar','--output',str(upstream),pin],check=True)
  check=stage/kind;check.mkdir()
  with tarfile.open(upstream) as t:t.extractall(check,filter='data')
  subprocess.run(['git','-C',str(check),'apply',str(recipe/(kind+'.patch'))],check=True)
  for path in subprocess.check_output(['git','-C',str(source),'diff','--name-only'],text=True).splitlines():
   if path.startswith('frontend/dist/'):continue
   assert (check/path).read_bytes()==(source/path).read_bytes(),path
 archive=stage/'donetick-utilibre.tar.gz'
 with tarfile.open(archive,'w:gz') as out:
  for kind in pins:
   with tarfile.open(stage/(kind+'.tar')) as src:
    for item in src.getmembers():
     assert item.isfile() or item.isdir(),item.name
     stream=src.extractfile(item) if item.isfile() else None
     item.name='upstream-'+kind+'/'+item.name;out.addfile(item,stream)
  for p in sorted(list(recipe.iterdir())+[root/'docs/donetick-deployment-2026-10-09.md']):
   assert p.is_file() and not p.is_symlink() and p.suffix not in ['.env','.key','.pem','.json']
   out.add(p,arcname=str(p.relative_to(root)),recursive=False)
 public=Path('/opt/utilibre/toolbox-public/donetick-utilibre.tar.gz');shutil.copy2(archive,public.with_suffix('.tmp'));public.with_suffix('.tmp').replace(public);public.chmod(0o644)
 digest=hashlib.sha256(public.read_bytes()).hexdigest();print(json.dumps({'sha256':digest,'url':'https://tools.utilibre.org/utilibre-source/donetick-utilibre.tar.gz?revision='+digest[:12],'pins':pins}))

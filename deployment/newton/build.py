#!/usr/bin/env python3
"""Build only NewTon's BSD browser tournament manager. No PHP or proprietary client."""
import hashlib,io,json,pathlib,shutil,subprocess,sys,tarfile
recipe=pathlib.Path(__file__).resolve().parent
source=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/newton')
output=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/opt/utilibre/build-newton')
work=pathlib.Path('/opt/utilibre/compile-newton')
pin='226d6080ea40e1dcc67c628e355bc826a7848858'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
work.mkdir(exist_ok=True);output.mkdir(exist_ok=True)
raw=subprocess.check_output(['git','-C',str(source),'archive',pin,'tournament.html','js','css','lib','images/NewTon-logo.svg','LICENSE','THIRD-PARTY-LICENSES.md','README.md'])
tarfile.open(fileobj=io.BytesIO(raw)).extractall(work,filter='data')
subprocess.run(['patch','--batch','--fuzz=0','-p1','-i',str(recipe/'local-static.patch')],cwd=work,check=True)
for name in ['js','css','lib','images']:shutil.copytree(work/name,output/name,dirs_exist_ok=True)
shutil.copyfile(work/'tournament.html',output/'index.html');shutil.copyfile(work/'tournament.html',output/'tournament.html')
for name in ['LICENSE','THIRD-PARTY-LICENSES.md']:shutil.copyfile(work/name,output/(name+'.txt' if name=='LICENSE' else name))
shutil.copytree(recipe/'licenses',output/'licenses',dirs_exist_ok=True)
assert not (output/'licensed').exists() and not (output/'api').exists() and not (output/'fonts').exists()
assert '<?php' not in (output/'index.html').read_text()
manifest={'upstream':pin,'version':'5.4.0-p1','files':{str(f.relative_to(output)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(output.rglob('*')) if f.is_file() and f.name!='build.json'}}
(output/'build.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({k:v for k,v in manifest.items() if k!='files'}))

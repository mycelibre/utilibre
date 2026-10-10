#!/usr/bin/env python3
"""Pin, patch and compile Knit using the upstream locked TypeScript dependency."""
import hashlib,io,json,pathlib,shutil,subprocess,sys,tarfile
recipe=pathlib.Path(__file__).resolve().parent
source=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/knit')
output=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/opt/utilibre/build-knit')
work=pathlib.Path('/opt/utilibre/compile-knit')
pin='42be1d858273e2e1dad3c6b379a4219057b5176d'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
work.mkdir(exist_ok=True);output.mkdir(exist_ok=True)
raw=subprocess.check_output(['git','-C',str(source),'archive',pin,'src','index.html','package.json','package-lock.json','tsconfig.json','LICENSE','README.md'])
tarfile.open(fileobj=io.BytesIO(raw)).extractall(work,filter='data')
subprocess.run(['patch','--batch','--fuzz=0','-p1','-i',str(recipe/'local-static.patch')],cwd=work,check=True)
subprocess.run(['npm','ci','--ignore-scripts','--no-fund'],cwd=work,check=True)
subprocess.run(['./node_modules/.bin/tsc','--sourceMap','false','--declaration','false','--declarationMap','false'],cwd=work,check=True)
for f in (work/'dist').glob('*.js'):shutil.copyfile(f,output/f.name)
shutil.copyfile(work/'index.html',output/'index.html');shutil.copyfile(work/'LICENSE',output/'LICENSE.txt')
(output/'LICENCE-NOTE.txt').write_text('The upstream repository LICENSE contains GNU GPL version 3. Its package.json says ISC. The precise intended grant/version scope is unconfirmed; both original notices are retained in the source offer.\n')
manifest={'upstream':pin,'version':'1.0.0-42be1d8-p1','files':{str(f.relative_to(output)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(output.rglob('*')) if f.is_file() and f.name!='build.json'}}
(output/'build.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest))

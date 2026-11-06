#!/usr/bin/env python3
"""Build one pinned standalone Core file without a package manager or backend."""
import hashlib, json, pathlib, subprocess, sys
recipe=pathlib.Path(__file__).resolve().parent
source=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/one-file-core')
output=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/opt/utilibre/build-one-file-core')
pin=subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()
releases={
 'b988be00cc35fe1a7d7756543b326287f2e4ebf5':('4.1.5-p1',recipe/'standalone.patch'),
 '7439c0f78b64aad87f1e71c62e593536e3faf3bb':('4.2.0-p1',recipe.parent/'maintenance/release-refresh-20261106/one-file-core-4.2.0.patch'),
}
assert pin in releases,'Unreviewed One File Core revision'
version,patch=releases[pin]
output.mkdir(parents=True,exist_ok=True)
original=subprocess.check_output(['git','-C',str(source),'show',pin+':the-one-file.html'])
file=output/'the-one-file.html'
file.write_bytes(original)
subprocess.run(['patch','--batch','--fuzz=0','-p1','-i',str(patch)],cwd=output,check=True)
file.rename(output/'one-file-core.html.download')
(output/'LICENSE.txt').write_bytes(subprocess.check_output(['git','-C',str(source),'show',pin+':LICENSE']))
(output/'index.html').write_bytes((recipe/'index.html').read_text().replace('Version 4.1.5', 'Version '+version.split('-')[0]).encode())
(output/'es').mkdir(exist_ok=True)
(output/'es'/'index.html').write_bytes((recipe/'index.es.html').read_text().replace('Versión 4.1.5', 'Versión '+version.split('-')[0]).encode())
for kind, path in [('one-file-core', output/'index.html'), ('one-file-core-es', output/'es'/'index.html')]:
    subprocess.run(['node',str(recipe.parent/'toolbox'/'prepare-static-description.mjs'),kind,str(path)],check=True)
manifest={'upstream':pin,'version':version,'files':{str(f.relative_to(output)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(output.rglob('*')) if f.is_file() and f.name!='build.json'}}
(output/'build.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))

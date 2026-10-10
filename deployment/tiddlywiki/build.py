#!/usr/bin/env python3
"""Native TiddlyWiki single-file builds: no npm install, listener or database."""
import hashlib,json,os,pathlib,subprocess,sys
recipe=pathlib.Path(__file__).resolve().parent
source=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else '/opt/utilibre/src/tiddlywiki')
output=pathlib.Path(sys.argv[2] if len(sys.argv)>2 else '/opt/utilibre/build-tiddlywiki')
pin='d391595836e2aead565480763f9bf9eb52e29e75'
assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==pin
assert not subprocess.check_output(['git','-C',str(source),'status','--porcelain','--untracked-files=no'])
output.mkdir(parents=True,exist_ok=True)
env=dict(os.environ,TIDDLYWIKI_PLUGIN_PATH=str(source/'plugins'),TIDDLYWIKI_THEME_PATH=str(source/'themes'),TIDDLYWIKI_LANGUAGE_PATH=str(source/'languages'),NODE_OPTIONS='--max-old-space-size=768')
for lang,language in [('en','$:/languages/en-GB'),('es','$:/languages/es-ES')]:
 subprocess.run(['node',str(source/'tiddlywiki.js'),str(recipe/'edition'),'--output',str(output),'--load',str(recipe/f'language-{lang}.tid'),'--render','$:/core/save/all',f'tiddlywiki-{lang}.html.download','text/plain'],check=True,env=env,cwd=source)
(output/'LICENSE.txt').write_bytes((source/'license').read_bytes())
(output/'index.html').write_bytes((recipe/'index.html').read_bytes())
(output/'es').mkdir(exist_ok=True)
(output/'es'/'index.html').write_bytes((recipe/'index.es.html').read_bytes())
manifest={'upstream':pin,'version':'5.4.1-p1','files':{str(f.relative_to(output)):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted(output.rglob('*')) if f.is_file() and f.name!='build.json'}}
(output/'build.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))

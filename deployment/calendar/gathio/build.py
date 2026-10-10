"""Reproduce the bounded Gathio corrections against the pinned clean checkout in argv1."""
from pathlib import Path
import subprocess,sys,shutil,os
source=Path(sys.argv[1]).resolve();here=Path(__file__).resolve().parent
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='98a5e9b719120e2f3e72f712a78c97fba1eff8e7'
subprocess.run(['git','apply','--check',str(here/'privacy-security.patch')],cwd=source,check=True);subprocess.run(['git','apply',str(here/'privacy-security.patch')],cwd=source,check=True)
env={**os.environ,'CYPRESS_INSTALL_BINARY':'0'}
subprocess.run(['npx','--yes','pnpm@10.30.3','install','--frozen-lockfile','--ignore-scripts'],cwd=source,env=env,check=True)
v=source/'public/vendor';v.mkdir(exist_ok=True)
for p,n in [('select2/dist/css/select2.min.css','select2.min.css'),('select2/dist/js/select2.min.js','select2.min.js'),('jquery/dist/jquery.min.js','jquery.min.js'),('alpinejs/dist/cdn.min.js','alpine.min.js'),('axios/dist/axios.min.js','axios.min.js')]:shutil.copyfile(source/'node_modules'/p,v/n)
subprocess.run(['npx','--yes','pnpm@10.30.3','run','test:unit'],cwd=source,env=env,check=True)
subprocess.run(['npx','--yes','pnpm@10.30.3','run','build'],cwd=source,env=env,check=True)
subprocess.run(['docker','build','-t','utilibre-gathio:1.6.7-p1','-f',str(here/'Dockerfile'),str(source)],check=True)
subprocess.run(['docker','build','-t','utilibre-gathio-documentdb:17.11-0.107.0','-f',str(here/'Postgres.Dockerfile'),str(here)],check=True)

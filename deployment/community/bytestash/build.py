"""Reproduce the native override from the exact upstream checkout supplied as argv1."""
from pathlib import Path
import subprocess,sys,os,shutil
source=Path(sys.argv[1]).resolve();here=Path(__file__).resolve().parent
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='72adce8872414e4a11ea193d4374309f72b3990c'
subprocess.run(['git','apply','--check',str(here/'privacy.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(here/'privacy.patch')],cwd=source,check=True)
shutil.copyfile(here/'client-package-lock.json',source/'client/package-lock.json');shutil.copyfile(here/'utilibre-releases.json',source/'client/public/utilibre-releases.json')
env={**os.environ,'NODE_OPTIONS':'--max-old-space-size=3072','VITE_APP_VERSION':'1.5.14-p1'}
subprocess.run(['npm','ci'],cwd=source/'client',env=env,check=True)
subprocess.run(['npm','run','build'],cwd=source/'client',env=env,check=True)
subprocess.run(['docker','build','-t','utilibre-bytestash:1.5.14-p1','-f',str(here/'Dockerfile'),str(source)],check=True)

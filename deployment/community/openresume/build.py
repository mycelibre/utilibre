"""Reproduce this static deployment from the pinned upstream checkout supplied as argv1."""
from pathlib import Path
import subprocess,sys,os,shutil,hashlib
source=Path(sys.argv[1]).resolve();here=Path(__file__).resolve().parent
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='4f8255a2c763479837f69f1dccf2a3338730cd79'
subprocess.run(['git','apply','--check',str(here/'privacy-static.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(here/'privacy-static.patch')],cwd=source,check=True)
# Replace the upstream commercial icon asset without republishing its original paths.
shutil.copyfile(here/'ResumePDFIcon.tsx',source/'src/app/components/Resume/ResumePDF/common/ResumePDFIcon.tsx')
env={**os.environ,'NEXT_TELEMETRY_DISABLED':'1','NODE_OPTIONS':'--max-old-space-size=3072'}
subprocess.run(['npm','ci'],cwd=source,env=env,check=True)
subprocess.run(['npm','run','build'],cwd=source,env=env,check=True)
subprocess.run(['docker','build','-t','utilibre-openresume:4f8255a-p1','-f',str(here/'Dockerfile'),str(source)],check=True)

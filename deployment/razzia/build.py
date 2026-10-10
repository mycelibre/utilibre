"""Build the pinned native app with removable dependency-only security corrections."""
from pathlib import Path
import subprocess,sys
source=Path(sys.argv[1]).resolve();here=Path(__file__).resolve().parent
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='277a33849827c0847ec85e99f2135888f72bd0c1'
subprocess.run(['git','apply','--check',str(here/'security-dependencies.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(here/'security-dependencies.patch')],cwd=source,check=True)
subprocess.run(['docker','build','-t','utilibre-razzia:3.1.0-p1','-f',str(here/'Dockerfile'),str(source)],check=True)

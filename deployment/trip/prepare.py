#!/usr/bin/env python3
"""Apply only the reviewed instance patch to an exact, clean upstream checkout."""
from pathlib import Path
import subprocess,sys
source=Path(sys.argv[1]).resolve();recipe=Path(__file__).resolve().parent
pin='856b1edfe81a735fce4b544c2e16a6518cebf164'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()==pin
assert not subprocess.check_output(['git','status','--porcelain'],cwd=source,text=True).strip(), 'Use a clean checkout'
for patch in ['restricted.patch','dependencies.patch','rendering.patch']:
 subprocess.run(['git','apply','--check',str(recipe/patch)],cwd=source,check=True)
 subprocess.run(['git','apply',str(recipe/patch)],cwd=source,check=True)

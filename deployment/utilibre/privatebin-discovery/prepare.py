#!/usr/bin/env python3
"""Regenerate a native custom template from the exact installed upstream source."""
from pathlib import Path
import hashlib,subprocess,sys
source=Path(sys.argv[1]).resolve()
recipe=Path(__file__).resolve().parent
config=recipe.parent/'config/privatebin'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='802b834509628a94a376112ea6561914741d649e'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=source,text=True).strip(),'Use a clean checkout'
assert hashlib.sha256((source/'tpl/bootstrap5.php').read_bytes()).hexdigest()=='a2f08f2d195b310850c1feaa7abdc1355a1e2cc576f262345e4849a373665902'
subprocess.run(['git','apply','--check',str(recipe/'homepage-template.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(recipe/'homepage-template.patch')],cwd=source,check=True)
(config/'bootstrap5-utilibre.php').write_bytes((source/'tpl/bootstrap5.php').read_bytes())
print('Native custom template generated; app data and configuration were not modified.')

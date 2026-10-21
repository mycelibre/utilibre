#!/usr/bin/env python3
"""Regenerate a native custom template from the exact installed upstream source."""
from pathlib import Path
import hashlib,subprocess,sys
source=Path(sys.argv[1]).resolve()
recipe=Path(__file__).resolve().parent
config=recipe.parent/'config/privatebin'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='c6f1b7186b8ab37aaf57ef4a2bcb58886e24e9ae'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=source,text=True).strip(),'Use a clean checkout'
assert hashlib.sha256((source/'tpl/bootstrap5.php').read_bytes()).hexdigest()=='389b70854dab31f004dc458acff27e4a40df4f29ac4c13209911bdcee6b786c7'
subprocess.run(['git','apply','--check',str(recipe/'homepage-template.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(recipe/'homepage-template.patch')],cwd=source,check=True)
(config/'bootstrap5-utilibre.php').write_bytes((source/'tpl/bootstrap5.php').read_bytes())
print('Native custom template generated; app data and configuration were not modified.')

#!/usr/bin/env python3
"""Regenerate a native custom template from the exact installed upstream source."""
from pathlib import Path
import hashlib,subprocess,sys
source=Path(sys.argv[1]).resolve()
recipe=Path(__file__).resolve().parent
config=recipe.parent/'config/privatebin'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=source,text=True).strip()=='921ab83f268add709413a87206e4e1c2e3c2063d'
assert not subprocess.check_output(['git','status','--porcelain'],cwd=source,text=True).strip(),'Use a clean checkout'
assert hashlib.sha256((source/'tpl/bootstrap5.php').read_bytes()).hexdigest()=='2e512624b6fdc391c9167e05cbd0bc8e62f5ed22a80c3d27cba635834940c701'
subprocess.run(['git','apply','--check',str(recipe/'homepage-template.patch')],cwd=source,check=True)
subprocess.run(['git','apply',str(recipe/'homepage-template.patch')],cwd=source,check=True)
(config/'bootstrap5-utilibre.php').write_bytes((source/'tpl/bootstrap5.php').read_bytes())
print('Native custom template generated; app data and configuration were not modified.')

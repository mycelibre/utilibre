"""Reuse the existing ntfy/OpenGist/FMD/Galene fixtures with finite output paths."""
import hashlib
import json
import os
from pathlib import Path
import sys
from adapter_scope import relocate_directory
os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/alpine-crypto')
previous=HERE.parent/'security-20261109'
inputs=json.loads((HERE/'alpine-crypto-inputs.json').read_text())
keys=sys.argv[1:]
assert keys and set(keys)<={'community-ntfy','opengist-opengist','additions-fmd','pack-galene-galene'}
old=json.loads((previous/'zlib-inputs.json').read_text())
# All fixture contents are pinned to the existing reviewed test set.
inputs['consumerFixtureHashes']=old['consumerFixtureHashes']
original=previous/'zlib-native-checks.py';code=relocate_directory(original.read_text(),previous)
def replace(old,new):
 global code
 assert code.count(old)==1,(old,code.count(old))
 code=code.replace(old,new)
replace("Path('/var/lib/utilibre-maintenance/security-20261109/zlib')",'Path('+repr(str(ROOT))+')')
replace("json.loads((HERE/'zlib-inputs.json').read_text())",'json.loads('+repr(json.dumps(inputs))+')')
replace("changes=[(r'\\/musl\\/',r'\\/zlib\\/',1)]", "changes=[(r'\\/security-20261109\\/musl\\/',r'\\/security-20261122\\/alpine-crypto\\/',1)]")
adapter=ROOT/'run-native-apps.py'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/'native-app-adapter.json').write_text(json.dumps({'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
 'adapterSha256':hashlib.sha256(code.encode()).hexdigest(),'changes':['exact image manifest and private output path validation; assertions unchanged']},indent=2)+'\n')
sys.argv=[str(adapter),*keys]
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':'__main__'})

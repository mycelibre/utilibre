"""Finite signed Debian downloads; no package install or production changes."""
import hashlib
import json
from pathlib import Path
import sys

HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
assert sys.argv[1:]==['--download']
original=HERE.parent/'security-20261109/acquire-debian.py';code=original.read_text()
old="root=Path('/var/lib/utilibre-maintenance/security-20261109')"
assert code.count(old)==1;code=code.replace(old,'root=Path('+repr(str(ROOT))+')')
start=code.index("want={'trixie':");end=code.index('\nif ubuntu:',start)
wanted=json.loads((HERE/'debian-wanted.json').read_text());assert wanted['schemaVersion']==1
code=code[:start]+'want='+repr(wanted['packages'])+code[end:]
adapter=ROOT/'acquire-debian-adapter.py'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
exec(compile(code,str(adapter),'exec'),{'__file__':str(original),'__name__':'__main__'})
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(ROOT/'debian-acquisition/adapter.json').write_text(json.dumps({'originalSha256':sha(original),'adapterSha256':sha(adapter),
 'selectionSha256':sha(HERE/'debian-wanted.json'),'changes':['finite version selection and evidence path']},indent=2)+'\n')

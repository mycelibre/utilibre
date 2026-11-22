"""Reuse the all-severity, frozen-database scanner for the finite PHP batch."""
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
original=HERE/'scan-nginx.py';code=original.read_text()
for old,new in [
    ("HERE=Path(__file__).resolve().parent", 'HERE=Path('+repr(str(HERE))+')'),
    ('ROOT=m.ROOT; inputs=m.INPUTS', "ROOT=m.ROOT; inputs=json.loads((HERE/'vendor-inputs.json').read_text())"),
    ("out=ROOT/'nginx'/key", "out=ROOT/'vendor'/key"),
]:
    assert code.count(old)==1,old;code=code.replace(old,new)
adapter=ROOT/'scan-vendor-adapter-v2.py'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/'scan-vendor-adapter.json').write_text(json.dumps({'originalSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
 'adapterSha256':hashlib.sha256(adapter.read_bytes()).hexdigest(),'changes':['finite manifest and evidence paths only']})+'\n')
exec(compile(code,str(adapter),'exec'),{'__file__':str(adapter),'__name__':'__main__'})

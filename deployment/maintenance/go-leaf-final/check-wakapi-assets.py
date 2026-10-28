"""Read frozen-image executable bytes only; compare all embedded UI/templates."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import tarfile
import sys

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
spec = next(x for x in json.loads((HERE/'images.json').read_text()) if x['key']=='wakapi-healthcheck')
assert all(a=='--oct28' for a in sys.argv[1:])
if '--oct28' in sys.argv:
    ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf/output')
    current = next(s for s in json.loads((HERE/'../security-20261028/go-helpers-inputs.json').read_text())['rows'] if s['key']=='wakapi')
    spec = {**spec, 'baseId': current['base']}
loader = importlib.util.spec_from_file_location('embed',HERE/'extract-embed.py')
embed = importlib.util.module_from_spec(loader)
loader.loader.exec_module(embed)
source = Path(spec['source'])
groups = [('static',['static'],None)]
for directory in ['views','views/mail']:
    names = sorted(p.name for p in (source/directory).glob('*.html'))
    # UI and mail independently embed names such as header.tpl.html. Preserve
    # each complete source-defined table, rather than flattening unlike files.
    groups.append((directory,names,len(names)))
cid = subprocess.check_output(['docker','create','--entrypoint','/bin/true',spec['baseId']],text=True).strip()
try:
    payload = subprocess.check_output(['docker','cp',cid+':/app/wakapi','-'])
    with tarfile.open(fileobj=io.BytesIO(payload)) as archive:
        members = [m for m in archive if m.isfile()]
        assert len(members)==1 and members[0].name=='wakapi'
        old = archive.extractfile(members[0]).read()
finally:
    subprocess.run(['docker','rm',cid],check=True,stdout=subprocess.DEVNULL)
new = (ROOT/'wakapi').read_bytes()
checked = []
for name,prefixes,count in groups:
    original,_ = embed.extract(old,prefixes,count)
    candidate,_ = embed.extract(new,prefixes,count)
    assert original==candidate,'Embedded Wakapi '+name+' content changed'
    checked.append({'filesystem':name,'files':len(candidate),'bytes':sum(map(len,candidate.values()))})
colors=(source/'data/colors.json').read_bytes()
assert old.count(colors)==1 and new.count(colors)==1,'Embedded language colors changed'
checked.append({'filesystem':'data/colors.json (embedded byte slice)','files':1,'bytes':len(colors)})
receipt = {'passed':True,'binarySha256':hashlib.sha256(new).hexdigest(),
           'baseImageId':spec['baseId'],'originalMainBinarySha256':hashlib.sha256(old).hexdigest(),
           'unchangedEmbeddedFiles':sum(row['files'] for row in checked),'filesystems':checked,
           'includes':'static assets, native UI/mail templates, language colors; existing privacy edits preserved'}
(ROOT/'wakapi-assets.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))

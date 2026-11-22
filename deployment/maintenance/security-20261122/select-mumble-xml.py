"""Select one signed Ubuntu maintenance update; no deployment approval."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122/mumble-xml')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
manifest=HERE/'mumble-xml-inputs.json'
assert not manifest.exists()
acquired=read(ROOT/'ubuntu-acquisition/authenticated.json')
assert set(acquired['packages'])=={'noble/libxml2'}
pin=acquired['packages']['noble/libxml2']
assert pin['version']=='2.9.14+dfsg-1.3ubuntu3.10'
assert sha(ROOT/'debian-acquisition'/pin['file'])==pin['sha256']
base='sha256:2d5253cdc3025ec167a993caff0b5da43b28eb3d72da71d9a056515a81cf6900'
name='utilibre-mumble-mumble-1'
image,ref=subprocess.check_output(['docker','inspect','--format','{{.Image}} {{.Config.Image}}',name],text=True,timeout=15).split()
assert image==base
common=read(HERE/'debian-inputs.json')
assert shutil.disk_usage(ROOT).free>=common['minimumFreeBytes']
for n in ('fixtures','before'):(ROOT/n).mkdir(mode=0o700)
fixture=Path('/var/lib/utilibre-maintenance/native-final/libxml2-output/old-abi-check')
shutil.copyfile(fixture,ROOT/'fixtures/xml-native');(ROOT/'fixtures/xml-native').chmod(0o755)
source=HERE.parent/'native-final/libxml2-old-abi.c'
shutil.copyfile(ROOT.parents[1]/'security.json',ROOT/'before/security.json')
shutil.copyfile(ROOT.parent/'scanner-inputs.json',ROOT/'scanner-inputs.json')
(ROOT/'scan-cache').symlink_to(ROOT.parent/'scan-cache')
value={k:common[k] for k in ('schemaVersion','minimumFreeBytes','database','exporterSha256')}
value.update(packages=acquired['packages'],acquisitionSha256=sha(ROOT/'ubuntu-acquisition/authenticated.json'),
 xmlFixture={'binarySha256':sha(fixture),'sourceSha256':sha(source),'source':str(source.relative_to(HERE.parents[2]))},
 rows=[{'key':'mumble-mumble','base':base,'oldRefs':[ref],'containers':[name],'kind':'ubuntu','suite':'noble',
 'packages':{'libxml2':{'installed':'2.9.14+dfsg-1.3ubuntu3.9','package':'noble/libxml2'}},
 'loadLibraries':['/usr/lib/x86_64-linux-gnu/libxml2.so.2'],
 'candidate':'utilibre-mumble-xml:20261122','approval':'preparation-only','releaseApproval':'not-approved'}])
manifest.write_text(json.dumps(value,indent=2)+'\n')
print('One exact Mumble XML candidate selected; existing native XML/protocol fixtures reused.')

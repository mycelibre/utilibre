"""Select the now-completed relay successor for the existing crypto repair.

Exact source, three packages and two declared roles. No build or activation.
"""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
OUT=ROOT/'openssl-relay-runtime'
manifest=HERE/'openssl-relay-runtime-inputs.json'
assert not OUT.exists() and not manifest.exists()
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
source=read(HERE/'openssl-runtime-inputs.json')
assert shutil.disk_usage(ROOT).free>=source['minimumFreeBytes']
assert sha(ROOT/'openssl-build-v2/built.json')==source['sourceBuildSha256']
release=read(ROOT/'successors/vendor-debian/release.json');assert release['status']=='passed'
for receipt in release['sourceReceipts']:assert sha(receipt['path'])==receipt['sha256']
build=read(ROOT/'successors/vendor-debian/galene-turn-turn/build.json')
assert build['passed']
names=['utilibre-galene-turn-turn-1','utilibre-turn-option-turn-1'];refs=set()
assert sorted(r['name'] for g in release['groups'] for r in g['rows'])==names
packages=['libssl3t64','openssl','openssl-provider-legacy']
for name in names:
 image,ref=subprocess.check_output(['docker','inspect','--format','{{.Image}} {{.Config.Image}}',name],text=True,timeout=15).split()
 assert image==build['imageId'];refs.add(ref)
 values=subprocess.check_output(['docker','exec',name,'dpkg-query','-W','-f=${Package}=${Version}\n',*packages],text=True,timeout=15)
 assert dict(l.split('=',1) for l in values.splitlines())==dict.fromkeys(packages,'3.5.7-1~deb13u3')
OUT.mkdir(mode=0o700)
for n in ('debian-acquisition','fixtures','before'):(OUT/n).mkdir(mode=0o700)
for pin in source['packages'].values():
 p=ROOT/'openssl-build-v2'/pin['file'];assert sha(p)==pin['sha256'];os.link(p,OUT/'debian-acquisition'/pin['file'])
shutil.copyfile(ROOT/'openssl-runtime/fixtures/openssl',OUT/'fixtures/openssl');(OUT/'fixtures/openssl').chmod(0o755)
assert sha(OUT/'fixtures/openssl')==source['nativeFixture']['cliSha256']
# The full fleet scan predates Galene's completed role transition; the exact
# candidate scan covers the shared immutable baseline and is separately bound.
shutil.copyfile(ROOT.parent/'security.json',OUT/'before/security.json')
shutil.copyfile(ROOT/'scanner-inputs.json',OUT/'scanner-inputs.json');(OUT/'scan-cache').symlink_to(ROOT/'scan-cache')
value={k:source[k] for k in ('schemaVersion','minimumFreeBytes','database','exporterSha256','sourceBuildSha256','packages','nativeFixture')}
value['predecessorReleaseSha256']=sha(ROOT/'successors/vendor-debian/release.json')
value['rows']=[{'key':'galene-turn-turn','base':build['imageId'],'containers':names,'oldRefs':sorted(refs),'kind':'debian','suite':'trixie',
 'packages':{n:{'installed':'3.5.7-1~deb13u3','package':n} for n in packages},'loadLibraries':['/usr/lib/x86_64-linux-gnu/libssl.so.3','/usr/lib/x86_64-linux-gnu/libcrypto.so.3'],
 'candidate':'utilibre-openssl-relays:20261122','approval':'preparation-only','releaseApproval':'not-approved'}]
manifest.write_text(json.dumps(value,indent=2)+'\n')
print('Completed two-role relay baseline selected; activation still requires idle checks.')

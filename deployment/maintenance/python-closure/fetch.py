#!/usr/bin/env python3
"""Small official wheels and signed Debian security patch sources only."""
import hashlib,json,lzma,subprocess,urllib.request
from pathlib import Path
root=Path('/var/lib/utilibre-maintenance/python-closure-20261012');root.mkdir(mode=0o700,exist_ok=True)
def fetch(url):
    with urllib.request.urlopen(url,timeout=30) as r:
        data=r.read(8*1024**2+1)
    assert len(data)<=8*1024**2
    return data
records=[]
for version in ['80.10.2','84.0.0']:
    j=json.loads(fetch('https://pypi.org/pypi/setuptools/'+version+'/json'))
    f=next(x for x in j['urls'] if x['filename'].endswith('.whl'))
    b=fetch(f['url']);assert hashlib.sha256(b).hexdigest()==f['digests']['sha256'];(root/f['filename']).write_bytes(b)
    records.append({'file':f['filename'],'url':f['url'],'sha256':f['digests']['sha256']})
archive='https://archive.debian.org/debian-security/'
release=fetch(archive+'dists/bullseye-security/InRelease');(root/'InRelease').write_bytes(release)
p=subprocess.run(['sqv','--keyring','/usr/share/keyrings/debian-archive-keyring.gpg','--cleartext','--output',str(root/'Release.verified'),str(root/'InRelease')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
assert p.returncode==0,'Archive signature must verify; historical EOL metadata is source provenance, not a support promise'
release=(root/'Release.verified').read_text();sha_section=False;source_hash=None
for line in release.splitlines():
    if line=='SHA256:':sha_section=True;continue
    if sha_section and not line.startswith(' '):sha_section=False
    if sha_section and line.strip().endswith(' main/source/Sources.xz'):source_hash=line.split()[0]
assert source_hash
source_bytes=fetch(archive+'dists/bullseye-security/main/source/Sources.xz');assert hashlib.sha256(source_bytes).hexdigest()==source_hash
entries=lzma.decompress(source_bytes).decode().split('\n\n')
for package,version in [('flask','1.1.2-2+deb11u1'),('python-werkzeug','1.0.1+dfsg1-2+deb11u2')]:
    matching=[e for e in entries if ('Package: '+package+'\n') in e and ('Version: '+version+'\n') in e]
    assert len(matching)==1,(package,'signed source entry')
    entry=matching[0];directory=next(x.split(': ',1)[1] for x in entry.splitlines() if x.startswith('Directory: '))
    prefix=archive+directory+'/';base=package+'_'+version
    expected_dsc=next(x.split()[0] for x in entry.split('Checksums-Sha256:\n')[1].splitlines() if x.strip().endswith(' '+base+'.dsc'))
    dsc=root/(base+'.dsc');data=fetch(prefix+dsc.name);assert hashlib.sha256(data).hexdigest()==expected_dsc;dsc.write_bytes(data)
    name=base+'.debian.tar.xz';expected=None;sha_section=False
    for line in data.decode().splitlines():
        if line=='Checksums-Sha256:':sha_section=True;continue
        if sha_section and not line.startswith(' '):sha_section=False
        if sha_section and line.strip().endswith(' '+name):expected=line.split()[0]
    assert expected
    b=fetch(prefix+name);assert hashlib.sha256(b).hexdigest()==expected;(root/name).write_bytes(b)
    records.append({'file':name,'url':prefix+name,'sha256':expected,'signedDsc':dsc.name})
(root/'sources.json').write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(records))

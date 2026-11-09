"""Explicit HTTPS acquisition; archived replay never refreshes these inputs.

Uses Debian's archive keyring and sqv, then verifies the compressed Packages
index and each exact .deb. No APT install/resolution and no service changes.
"""
import hashlib
import json
import lzma
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

assert sys.argv[1:]==['--download']
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261109/debian-acquisition')
root.mkdir(exist_ok=True)
key=Path('/usr/share/keyrings/debian-archive-keyring.pgp')
want={'trixie':{'apt':'3.0.4','libapt-pkg7.0':'3.0.4','zlib1g':'1:1.3.dfsg+really1.3.1-1+deb13u1'},
      'bookworm':{'apt':'2.6.2','libapt-pkg6.0':'2.6.2'}}
sha=lambda b:hashlib.sha256(b).hexdigest()
def download(url,file,limit):
    if file.exists():return file.read_bytes()
    assert url.startswith('https://deb.debian.org/')
    with urllib.request.urlopen(url,timeout=30) as r:
        assert r.url.startswith('https://deb.debian.org/')
        b=r.read(limit+1);assert len(b)<=limit
    file.write_bytes(b);return b

proof=[];packages={}
for suite,versions in want.items():
    for archive,dist in [('debian',suite),('debian-security',suite+'-security'),('debian',suite+'-updates')]:
        missing={k:v for k,v in versions.items() if suite+'/'+k not in packages}
        if not missing:break
        d=root/dist;d.mkdir(exist_ok=True)
        base='https://deb.debian.org/'+archive
        release=download(base+'/dists/'+dist+'/InRelease',d/'InRelease',1024**2)
        signed=d/'verified-release'
        if signed.exists():signed.unlink()
        subprocess.run(['sqv','--keyring',str(key),'--cleartext','--output',str(signed),str(d/'InRelease')],check=True,capture_output=True,timeout=30)
        path='main/binary-amd64/Packages.xz'
        entries=signed.read_text().split('\nSHA256:\n')[1].split('\n')
        entry=next(l.strip().split() for l in entries if l.strip().endswith(' '+path))
        blob=download(base+'/dists/'+dist+'/'+path,d/'Packages.xz',40*1024**2)
        assert len(blob)==int(entry[1]) and sha(blob)==entry[0]
        text=lzma.decompress(blob).decode()
        proof.append({'suite':suite,'distribution':dist,'releaseSha256':sha(release),'packagesSha256':sha(blob),'url':base+'/dists/'+dist+'/InRelease'})
        for stanza in text.split('\n\n'):
            fields=dict(l.split(': ',1) for l in stanza.splitlines() if l and not l[0].isspace() and ': ' in l)
            name=fields.get('Package')
            if name not in missing or fields.get('Version')!=missing[name]:continue
            filename=fields['Filename'];assert filename.startswith('pool/') and '..' not in filename.split('/')
            file=root/Path(filename).name
            blob=download(base+'/'+filename,file,16*1024**2)
            assert sha(blob)==fields['SHA256'] and len(blob)==int(fields['Size'])
            packages[suite+'/'+name]={'name':name,'version':fields['Version'],'file':file.name,'sha256':sha(blob),'url':base+'/'+filename,'distribution':dist,'depends':fields.get('Depends',''),'preDepends':fields.get('Pre-Depends','')}
        print(dist+': authenticated; '+str(len(packages))+' selected packages',flush=True)
assert set(packages)=={s+'/'+n for s,p in want.items() for n in p},'Exact package missing; do not substitute another version'
report={'date':datetime.now(timezone.utc).isoformat(),'keySha256':sha(key.read_bytes()),'indexes':proof,'packages':packages,'method':'sqv + SHA256 chained package authentication; HTTPS; exact versions; no installation'}
(root/'authenticated.json').write_text(json.dumps(report,indent=2)+'\n')

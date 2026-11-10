"""Explicit HTTPS acquisition; archived replay never refreshes these inputs.

Uses the distribution's pinned archive keyring and sqv, then verifies Packages
index and each exact .deb. No APT install/resolution and no service changes.
"""
import hashlib
import gzip
import json
import lzma
import os
import shutil
from pathlib import Path
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone

assert sys.argv[1:] in (['--download'], ['--download', '--ubuntu'], ['--download', '--dhi'])
ubuntu = '--ubuntu' in sys.argv
dhi = '--dhi' in sys.argv
os.umask(0o077)
root=Path('/var/lib/utilibre-maintenance/security-20261109') / ('dhi-acquisition' if dhi else 'ubuntu-acquisition' if ubuntu else 'debian-acquisition')
root.mkdir(exist_ok=True)
key=Path('/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012/input/ubuntu-archive-keyring.gpg' if ubuntu else '/usr/share/keyrings/debian-archive-keyring.pgp')
if ubuntu:
    assert hashlib.sha256(key.read_bytes()).hexdigest() == '80a36b0a6de2f69f49d2df75ef473ccde121e9e190b9ea01d20a4f63778d5c31'
if dhi:
    key=Path('/var/lib/utilibre-maintenance/xserver-followup-20261012/dhi/dhi-deb-main.gpg')
    assert hashlib.sha256(key.read_bytes()).hexdigest() == '6f3fec0bd867abb05443bf0487f27426815ce2fa5d75e1136021560518ce78f3'
want={'trixie':{'apt':'3.0.4','libapt-pkg7.0':'3.0.4','zlib1g':'1:1.3.dfsg+really1.3.1-1+deb13u1'},
      'bookworm':{'apt':'2.6.2','libapt-pkg6.0':'2.6.2'}}
if ubuntu:
    want={'noble':{'apt':'2.8.4ubuntu0.1','libapt-pkg6.0t64':'2.8.4ubuntu0.1'},
          'jammy':{'apt':'2.4.15ubuntu0.1','libapt-pkg6.0':'2.4.15ubuntu0.1'}}
if dhi:want={'dhi-trixie':{'apt':'3.0.4+dhi0','libapt-pkg7.0':'3.0.4+dhi0'}}
origin='https://dhi.io/deb/debian/' if dhi else 'https://security.ubuntu.com/' if ubuntu else 'https://deb.debian.org/'
sha=lambda b:hashlib.sha256(b).hexdigest()
def download(url,file,limit):
    if file.exists():return file.read_bytes()
    assert url.startswith(origin)
    with urllib.request.urlopen(url,timeout=30) as r:
        assert r.url.startswith(origin)
        b=r.read(limit+1);assert len(b)<=limit
    file.write_bytes(b);return b

proof=[];packages={}
for suite,versions in want.items():
    for archive,dist in ([('main','trixie')] if dhi else [('ubuntu',suite+'-security')] if ubuntu else [('debian',suite),('debian-security',suite+'-security'),('debian',suite+'-updates')]):
        missing={k:v for k,v in versions.items() if suite+'/'+k not in packages}
        if not missing:break
        d=root/dist;d.mkdir(exist_ok=True)
        base=origin+archive
        release=download(base+'/dists/'+dist+'/InRelease',d/'InRelease',1024**2)
        signed=d/'verified-release'
        if signed.exists():signed.unlink()
        subprocess.run(['sqv','--keyring',str(key),'--cleartext','--output',str(signed),str(d/'InRelease')],check=True,capture_output=True,timeout=30)
        compressed='Packages.gz' if dhi else 'Packages.xz'
        path='main/binary-amd64/'+compressed
        entries=signed.read_text().split('\nSHA256:\n')[1].split('\n')
        entry=next(l.strip().split() for l in entries if l.strip().endswith(' '+path))
        blob=download(base+'/dists/'+dist+'/'+path,d/compressed,40*1024**2)
        assert len(blob)==int(entry[1]) and sha(blob)==entry[0]
        text=(gzip.decompress(blob) if dhi else lzma.decompress(blob)).decode()
        assert len(text)<=160*1024**2
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
receipt=root/'authenticated.json'
if receipt.exists():
    previous=json.loads(receipt.read_text())
    assert {k:v for k,v in previous.items() if k!='date'} == {k:v for k,v in report.items() if k!='date'}, 'Preserved acquisition evidence differs'
    print('Existing authenticated receipt retained; no freshness reset',flush=True)
else:
    receipt.write_text(json.dumps(report,indent=2)+'\n')
if ubuntu or dhi:
    # Existing vendor-overlay runner uses this common immutable package pool.
    # Ubuntu retains its own signing evidence and receipt, selected at release.
    pool=root.parent/'debian-acquisition'
    for p in packages.values():
        target=pool/p['file']
        if target.exists():assert sha(target.read_bytes())==p['sha256']
        else:shutil.copyfile(root/p['file'],target)

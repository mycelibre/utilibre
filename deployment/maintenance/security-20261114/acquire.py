"""Explicit finite vendor acquisition; no installation or production changes.

Reuse the reviewed signed Debian-index downloader. Alpine signatures are checked
by the target distribution's apk before isolated preparation. Replay consumes
these exact saved files and does not resolve newer versions.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261114')
ROOT.mkdir(exist_ok=True)
assert sys.argv[1:] in (['debian'], ['alpine'])

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

if sys.argv[1] == 'debian':
    original = HERE.parent/'security-20261109/acquire-debian.py'
    code = original.read_text()
    # Only evidence root and explicit vendor versions change. Signature chain,
    # finite HTTPS origins, download limits and exact-version rejection remain.
    old = "root=Path('/var/lib/utilibre-maintenance/security-20261109')"
    assert code.count(old) == 1
    code = code.replace(old, "root=Path('"+str(ROOT)+"')")
    start = code.index("want={'trixie':")
    end = code.index('\nif ubuntu:', start)
    want = {'trixie': {
        'apache2':'2.4.71-1~deb13u1', 'apache2-bin':'2.4.71-1~deb13u1',
        'apache2-data':'2.4.71-1~deb13u1', 'apache2-utils':'2.4.71-1~deb13u1',
        'libpq5':'17.12-0+deb13u1', 'libpq-dev':'17.12-0+deb13u1'}}
    code = code[:start]+'want='+repr(want)+code[end:]
    adapter = ROOT/'acquire-debian-adapter.py'
    if adapter.exists(): assert adapter.read_text() == code
    else: adapter.write_text(code)
    sys.argv = [str(original), '--download']
    exec(compile(code, str(adapter), 'exec'), {'__name__':'__main__','__file__':str(original)})
    (ROOT/'debian-acquisition/adapter.json').write_text(json.dumps({
        'original':str(original), 'originalSha256':sha(original),
        'adapterSha256':sha(adapter), 'changes':['evidence root','finite package/version selection'],
        'productionChanged':False},indent=2)+'\n')
else:
    versions = {'3.23': {'apache2':'2.4.71-r0', 'libpq':'18.7-r0'},
                '3.24': {'libpq':'18.7-r0'}, '3.21': {'nodejs':'22.23.5-r0'}}
    packages = {}
    for branch, selection in versions.items():
        out = ROOT/'packages'/('alpine-'+branch); out.mkdir(parents=True,exist_ok=True)
        for name, version in selection.items():
            filename = name+'-'+version+'.apk'
            url = 'https://dl-cdn.alpinelinux.org/alpine/v'+branch+'/main/x86_64/'+filename
            target = out/filename
            if not target.exists():
                with urllib.request.urlopen(url,timeout=30) as response:
                    assert response.url == url
                    content = response.read(32*1024**2+1)
                    assert len(content) <= 32*1024**2
                target.write_bytes(content)
            packages[branch+'/'+name] = {'name':name,'version':version,'branch':branch,
                'file':filename,'url':url,'sha256':sha(target),
                'authentication':'Target distribution apk verify required before preparation'}
            print(branch+'/'+name+': downloaded exact vendor artifact',flush=True)
    receipt = ROOT/'alpine-packages.json'
    if receipt.exists(): assert json.loads(receipt.read_text()) == packages
    else: receipt.write_text(json.dumps(packages,indent=2)+'\n')

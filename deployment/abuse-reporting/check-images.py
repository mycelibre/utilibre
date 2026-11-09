"""Verify the four finite notice-only images; no running service changes."""
import hashlib, json, os, subprocess, tarfile
from pathlib import Path

os.umask(0o077)
here=Path(__file__).resolve().parent
root=Path('/var/lib/utilibre-maintenance/security-20261109/abuse-reporting')
root.mkdir(exist_ok=True)
inputs=json.loads((here/'inputs.json').read_text())
staged=json.loads(Path('/tmp/utilibre-abuse-candidates-20261109-final/manifest.json').read_text())
def run(*args): return subprocess.check_output(args,stderr=subprocess.PIPE,timeout=180)
def sha(b): return hashlib.sha256(b).hexdigest()
def inspect(image): return json.loads(run('docker','inspect',image))[0]
def inventory(image,key):
    cid=run('docker','create',image).decode().strip();archive=root/(key+'.tar')
    try:
        run('docker','export','-o',str(archive),cid)
        with tarfile.open(archive) as tar:
            rows={}
            for f in tar:
                p='/'+f.name.lstrip('./')
                if f.isdir() or p in ['/.dockerenv','/etc/hostname','/etc/hosts','/etc/resolv.conf']: continue
                rows[p]=[f.type.decode(),f.mode,f.uid,f.gid,f.linkname,sha(tar.extractfile(f).read()) if f.isfile() else None]
            return rows
    finally:
        run('docker','rm',cid);archive.unlink(missing_ok=True)
records=[]
for key in ['chhoto','privatebin','wbo','pollaris']:
    if key=='chhoto':
        container='utilibre-chhoto-app-1';base='sha256:a3ae673ca744e56402a07087bf38d89040832eeff05cb65eb11cd25fe4c1b91a';candidate='utilibre-chhoto:7.10.8-p2'
        files=[{'target':'/app/frontend/base/index.html','beforeSha256':sha(Path('/var/lib/utilibre-maintenance/security-20261109/chhoto-abuse/before.html').read_bytes()),'afterSha256':sha(Path('/var/lib/utilibre-maintenance/security-20261109/chhoto-abuse/after.html').read_bytes())}]
        native=json.loads(Path('/var/lib/utilibre-maintenance/security-20261109/chhoto-abuse/native-complete/result.json').read_text());assert native['passed']
    else:
        spec=next(r for r in staged if r['service']==key)
        files=next(r for r in inputs['services'] if r['service']==key)['files']
        container=spec['container'];base=spec['image'];candidate=f'utilibre-abuse-{key}:20261109'
        assert all(not f['mounted'] for f in spec['files'])
        if key in ['privatebin','wbo']:
            native=json.loads((root/'native-browser.json').read_text())
            assert not native['externalRequests'] and not native['browserErrors']
            assert all(any(c['surface']==key+'-'+s and c['reportLinks']==2 and c['referrerSuppressed'] for c in native['checks']) for s in ['home','shared'])
        else:
            native=json.loads((root/'pollaris-browser.json').read_text())
            assert len(native['results'])==4 and all(r['reportLinks']==2 and not r['externalRequests'] and not r['browserErrors'] for r in native['results'])
    assert inspect(container)['Image']==base
    image=inspect(candidate)['Id'];assert inspect(image)['Config']==inspect(base)['Config']
    before=inventory(base,key+'-old');after=inventory(image,key+'-new')
    changed=sorted(p for p in before.keys() | after.keys() if before.get(p)!=after.get(p))
    assert changed==sorted(f['target'] for f in files)
    for f in files:
        assert before[f['target']][-1]==f['beforeSha256'] and after[f['target']][-1]==f['afterSha256']
    records.append({'key':key,'container':container,'base':base,'candidate':candidate,'imageId':image,'changedFiles':changed,'allOtherFilesAndConfigurationUnchanged':True,'nativeChecksPassed':True})
    print(key+': only reviewed notice files changed; native proof passed',flush=True)
(root/'images.json').write_text(json.dumps({'passed':True,'rows':records,'fixtureSha256':sha(Path(__file__).read_bytes())},indent=2)+'\n')

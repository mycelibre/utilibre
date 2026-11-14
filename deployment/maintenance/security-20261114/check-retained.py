"""Prove the complete before/final image delta for this finite release only.

No triage decisions, mounted data, network requests or running-service changes.
Reuses the streamed image inventory. Reports are private and content hashes only.
"""
import hashlib, importlib.util, json, os, subprocess, sys
from pathlib import Path
from datetime import datetime, timezone

os.umask(0o077)
H = Path(__file__).resolve().parent
R = Path('/var/lib/utilibre-maintenance/security-20261114')
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
helper = H.parent/'security-20261109/zlib-check.py'
assert sha(helper) == 'cdc9aabef1034e18a3951d0d83caf32f9cf5b03dd7b72ac5bd8575d8e57bbf08'
spec = importlib.util.spec_from_file_location('image_inventory', helper)
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
baseline = read(R/'before-security.json')
assert sha(R/'before-security.json') == read(H/'inputs.json')['baselineScanSha256']
selected = {}
for filename, python in [('inputs.json',False),('python-inputs.json',True),('headers-inputs.json',False),('git-inputs.json',False)]:
    data = read(H/filename)
    for row in data['rows']:
        for name in row['containers']:
            s = selected.setdefault(name, {'packages':set(), 'prefixes':set()})
            if python:
                for n,p in row['packages'].items():
                    root=p['site'].lstrip('/')+'/'
                    s['prefixes'].update([root+('dns' if n=='dnspython' else n)+'/', root+n+'-'+p['version']+'.dist-info/',root+n+'-'+data['wheels'][n]['version']+'.dist-info/'])
            else:
                s['packages'].update(row['packages'])
selected['utilibre-expanded-penpot-exporter-1']['packages'].add('xvfb')
out=R/'retained';out.mkdir(exist_ok=True)
done={}
for name,s in selected.items():
    old=next(x for x in baseline['images'] if name in x['containers'])['id']
    current=json.loads(m.run(['docker','inspect','--format','{"image":{{json .Image}},"running":{{.State.Running}}}',name]))
    assert current['running']; new=current['image']; assert old!=new
    key=old[7:19]+'-'+new[7:19]; target=out/(key+'.json')
    if key in done: continue
    if target.exists():
        p=read(target);assert p['passed'] and p['oldImage']==old and p['imageId']==new
        done[key]=p;continue
    a,b=[m.export_manifest(i) for i in (old,new)]
    allowed=set();info=set()
    alpine='lib/apk/db/installed' in a
    for image in (old,new):
        for package in sorted(s['packages']):
            if alpine:
                lines=m.run(['docker','run','--rm',*m.LIMITS,'--user','0','--entrypoint','apk',image,'--no-network','info','-L',package]).decode().splitlines()[1:]
            else:
                lines=m.run(['docker','run','--rm',*m.LIMITS,'--user','0','--entrypoint','dpkg-query',image,'-L',package]).decode().splitlines()
            allowed.update(p.lstrip('/').rstrip('/') for p in lines if p)
            info.add(package)
    def permitted(p):
        if p in allowed or any(p==x.rstrip('/') or p.startswith(x) for x in s['prefixes']):return True
        if alpine:return p in ('lib/apk/db/installed','lib/apk/db/scripts.tar','lib/apk/db/scripts.tar.gz','etc/apk/world','etc/apache2/httpd.conf.apk-new')
        if p in ('var/lib/dpkg/status','var/lib/dpkg/status-old','var/lib/dpkg/lock','var/lib/dpkg/lock-frontend','var/log/dpkg.log','var/cache/ldconfig/aux-cache','etc/ld.so.cache'):return True
        if p.startswith('var/lib/dpkg/info/'):
            tail=p.removeprefix('var/lib/dpkg/info/')
            return any(tail.startswith(n+'.') or tail.startswith(n+':amd64.') for n in info)
        return False
    changed={p:{'before':a.get(p),'after':b.get(p)} for p in sorted(a.keys()|b.keys()) if a.get(p)!=b.get(p)}
    unexpected=[p for p in changed if not permitted(p)]
    (out/(key+'-changes.json')).write_text(json.dumps(changed,sort_keys=True,indent=2)+'\n')
    assert not unexpected, (name,unexpected[:30])
    config=[json.loads(m.run(['docker','image','inspect','--format','{{json .Config}}',i])) for i in (old,new)]
    assert config[0]==config[1], 'Image execution configuration changed'
    p={'passed':True,'date':datetime.now(timezone.utc).isoformat(),'oldImage':old,'imageId':new,'containers':[n for n in selected if n in next(x for x in baseline['images'] if x['id']==old)['containers']], 'packagesChanged':sorted(s['packages']),'pythonPrefixes':sorted(s['prefixes']), 'changesSha256':sha(out/(key+'-changes.json')),'allUnrelatedFilesUnchanged':True,'configurationUnchanged':True,'changedCount':len(changed),'unchangedCount':sum(a.get(k)==v for k,v in b.items()),'helperSha256':sha(helper),'baselineQueueSha256':sha(R/'before-security-queue.json')}
    target.write_text(json.dumps(p,indent=2)+'\n');done[key]=p
    print(name+': complete image delta verified',flush=True)
(out/'index.json').write_text(json.dumps({'passed':True,'rows':list(done.values())},indent=2)+'\n')

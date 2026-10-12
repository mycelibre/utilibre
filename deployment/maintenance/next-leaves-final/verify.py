#!/usr/bin/env python3
"""Immutable image parity, genuine Next version and offline scanner gate."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time

directory=Path('/var/lib/utilibre-maintenance/next-leaves-final-20261012')
image=json.loads((directory/'bookplate-image.json').read_text())
def command(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,timeout=240)
    if p.returncode:raise RuntimeError('Bounded image verification failed; no child details disclosed')
    return p.stdout
def files(ref):
    cid=command(['docker','create','--network','none','--entrypoint','/bin/true',ref]).decode().strip()
    try:
        p=subprocess.Popen(['docker','export',cid],stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
        result={}
        with tarfile.open(fileobj=p.stdout,mode='r|') as archive:
            for entry in archive:
                name='/'+entry.name.lstrip('./')
                if name in ['/etc/hosts','/etc/hostname','/etc/resolv.conf']:continue
                if entry.isfile():
                    h=hashlib.sha256();f=archive.extractfile(entry)
                    while chunk:=f.read(1024*1024):h.update(chunk)
                    result[name]=h.hexdigest()
                elif entry.issym() or entry.islnk():result[name]='link:'+entry.linkname
        assert p.wait()==0
        return result
    finally:command(['docker','rm','-v',cid])
if hasattr(os,'sched_getaffinity'):os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
before,after=files(image['base']),files(image['imageId'])
changed=[p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)]
assert all(p.startswith('/app/') for p in changed),'Unexpected runtime-system change'
for prefix in ['/app/public/','/app/drizzle/','/app/scripts/']:
    assert {p:h for p,h in before.items() if p.startswith(prefix)}=={p:h for p,h in after.items() if p.startswith(prefix)},prefix
version=command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','node',image['imageId'],'-p','require("next/package.json").version']).decode().strip()
assert version=='16.3.8'
command(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(directory/'bookplate-scan.json'),image['imageId']])
scan=json.loads((directory/'bookplate-scan.json').read_text())
findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
assert not [v for v in findings if v['PkgName']=='next'],'Next advisory remains'
native=json.loads((directory/'bookplate-native.json').read_text())
assert native['passed'] and native['imageId']==image['imageId']
result={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'passed':True,'imageId':image['imageId'],'base':image['base'],'next':version,'unchangedRuntime':True,'onlyApplicationTreeChanged':True,'publicMigrationsNativeAdminHelpersIdentical':True,'outsideAppUnchangedFiles':sum(not p.startswith('/app/') for p in after),'changedAppFiles':len(changed),'nextFindings':0,'counts':{s:sum(v['Severity']==s for v in findings) for s in ['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN']},'productionChanged':False}
(directory/'bookplate-verify.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))

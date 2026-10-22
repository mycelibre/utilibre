#!/usr/bin/env python3
"""Immutable image parity, genuine Next version and offline scanner gate."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import time
import sys

assert sys.argv[1:] in ([], ['--oct22'], ['--biblioreads-oct22'], ['--candlr-oct22'], ['--markmap-oct22'], ['--degoog-oct22'], ['--spliit-oct22'], ['--rallly-oct22'], ['--grist-oct22'])
grist=sys.argv[1:]==['--grist-oct22']
nextapp=next((key for key in ['spliit','rallly'] if sys.argv[1:]==['--'+key+'-oct22']),None)
degoog=sys.argv[1:]==['--degoog-oct22']
client=next((key for key in ['candlr','markmap'] if sys.argv[1:]==['--'+key+'-oct22']),None)
bibliography=sys.argv[1:]==['--biblioreads-oct22']
current=bool(sys.argv[1:])
expected_next='15.5.28' if bibliography else '16.4.1' if current else '16.3.8'
directory=Path('/var/lib/utilibre-maintenance/security-20261022/'+client if client else '/var/lib/utilibre-maintenance/security-20261022/biblioreads' if bibliography else '/var/lib/utilibre-maintenance/security-20261022/bookplate' if current else '/var/lib/utilibre-maintenance/next-leaves-final-20261012')
name=client or ('biblioreads' if bibliography else 'bookplate')
if nextapp or degoog or grist:
    name=nextapp or ('grist' if grist else 'degoog');directory=Path('/var/lib/utilibre-maintenance/security-20261022/'+name)
image=json.loads((directory/('build.json' if client or nextapp or degoog or grist else name+'-image.json')).read_text())
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
allowed=['/app/frontend/dist/','/app/frontend/node_modules/dompurify/'] if client=='candlr' else ['/usr/share/nginx/html/'] if client=='markmap' else ['/app/']
if nextapp=='spliit':allowed=['/usr/app/']
if degoog:allowed=['/app/src/public/app.js','/app/src/public/settings-page.js','/app/node_modules/dompurify/']
if grist:allowed=['/grist/static/','/grist/node_modules/dompurify/','/grist/node_modules/isomorphic-dompurify/node_modules/dompurify/']
assert all(any(p.startswith(prefix) for prefix in allowed) for p in changed),'Unexpected runtime-system change'
preserved=[] if client or degoog else ['/usr/app/prisma/','/usr/app/prisma.config.ts','/usr/app/scripts/','/usr/app/public/'] if nextapp=='spliit' else ['/app/prisma/','/app/prisma.config.ts','/app/docker-start.sh','/app/apps/web/public/'] if nextapp=='rallly' else ['/app/public/favicon','/app/utilibre-preload.cjs'] if bibliography else ['/app/public/','/app/drizzle/','/app/scripts/']
if grist:preserved=['/grist/_build/','/grist/sandbox/','/usr/local/bin/grist-deno','/grist/static/custom.css']
for prefix in preserved:
    assert {p:h for p,h in before.items() if p.startswith(prefix)}=={p:h for p,h in after.items() if p.startswith(prefix)},prefix
if client or degoog or grist:
    version='3.4.17'
    if grist:
        for p in ['/grist/node_modules/dompurify/','/grist/node_modules/isomorphic-dompurify/node_modules/dompurify/']:
            assert command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','node',image['imageId'],'-p','require('+json.dumps(p+'package.json')+').version']).decode().strip()==version
    elif degoog:assert command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','bun',image['imageId'],'-e','console.log(require("/app/node_modules/dompurify/package.json").version)']).decode().strip()==version
    elif client=='candlr':assert command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','node',image['imageId'],'-p','require("/app/frontend/node_modules/dompurify/package.json").version']).decode().strip()==version
    else:
        output=command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','sh',image['imageId'],'-c','grep -l "3.4.17" /usr/share/nginx/html/assets/*.js'])
        assert output.strip(),'Compiled DOMPurify version absent'
else:
    require_path='/app/apps/web/node_modules/next/package.json' if nextapp=='rallly' else 'next/package.json'
    version=command(['docker','run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','node',image['imageId'],'-p','require('+json.dumps(require_path)+').version']).decode().strip()
    assert version==expected_next
os.environ['TRIVY_SKIP_VERSION_CHECK']='true'
command(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(directory/(name+'-scan.json')),image['imageId']])
scan=json.loads((directory/(name+'-scan.json')).read_text())
findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
assert not [v for v in findings if v['PkgName']==('dompurify' if client or degoog or grist else 'next')],'Repaired library advisory remains'
native=json.loads((directory/('native.json' if bibliography or client or nextapp or degoog or grist else 'bookplate-native.json')).read_text())
assert (native.get('passed') or native.get('status')=='passed') and native['imageId']==image['imageId']
result={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'passed':True,'imageId':image['imageId'],'base':image['base'],'next':version,'unchangedRuntime':True,'onlyApplicationTreeChanged':True,'publicMigrationsNativeAdminHelpersIdentical':True,'outsideAppUnchangedFiles':sum(not p.startswith('/app/') for p in after),'changedAppFiles':len(changed),'nextFindings':0,'counts':{s:sum(v['Severity']==s for v in findings) for s in ['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN']},'productionChanged':False}
if bibliography:
    result.pop('publicMigrationsNativeAdminHelpersIdentical')
    result['faviconAndPrivacyWrapperIdentical']=True
if client or degoog or grist:
    result.pop('publicMigrationsNativeAdminHelpersIdentical');result.pop('next');result.pop('nextFindings');result['dompurify']=version;result['dompurifyFindings']=0;result['allowedPaths']=allowed
    result['outsideAppUnchangedFiles']=sum(not any(p.startswith(prefix) for prefix in allowed) for p in after)
if nextapp:
    result['preservedPaths']=preserved;result['outsideAppUnchangedFiles']=sum(not any(p.startswith(prefix) for prefix in allowed) for p in after)
(directory/(name+'-verify.json')).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))

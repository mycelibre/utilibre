#!/usr/bin/env python3
"""Actual image-byte comparison and scanner inventory; never live user data."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import time

ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser();parser.add_argument('family',choices=['python','npm']);parser.add_argument('key');parser.add_argument('--manifest');args=parser.parse_args()
manifest=args.manifest or args.family+'-images.json'
assert Path(manifest).name==manifest and manifest.endswith('.json')
spec=next(x for x in json.loads((ROOT/manifest).read_text()) if x['key']==args.key)
report=Path(tempfile.mkdtemp(prefix='language-verify-'+args.key+'-',dir='/opt/utilibre/reports'))
if hasattr(os,'sched_getaffinity'):
    os.sched_setaffinity(0,{min(os.sched_getaffinity(0))})
def native(image,code):
    return json.loads(subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--cpus','1','--memory','256m','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint','python',image,'-c',code],text=True))
def files(image):
    cid=subprocess.check_output(['docker','create','--entrypoint','/bin/true',image],text=True).strip()
    try:
        process=subprocess.Popen(['docker','export',cid],stdout=subprocess.PIPE)
        result={}
        with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
            for entry in archive:
                path='/'+entry.name.lstrip('./')
                if path in ['/etc/hosts','/etc/hostname','/etc/resolv.conf']:continue
                if entry.isfile():
                    f=archive.extractfile(entry);h=hashlib.sha256()
                    while chunk:=f.read(1024*1024):h.update(chunk)
                    result[path]=h.hexdigest()
                elif entry.issym() or entry.islnk():result[path]='link:'+entry.linkname
        assert process.wait()==0
        return result
    finally:subprocess.run(['docker','rm',cid],stdout=subprocess.DEVNULL,check=True)

base=spec['baseId'];candidate=spec['candidate']
before,after=files(base),files(candidate)
changes=[p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)]
if args.family=='python':
    receipt=native(candidate,"from pathlib import Path; print(Path('/usr/local/share/utilibre-language/removed-build-installer.json').read_text())")
    removed=receipt['removed'];added='/usr/local/share/utilibre-language/removed-build-installer.json'
    assert added in changes
    for path in changes:
        if path==added:continue
        assert path in before and path not in after,path
        assert any(path==r or path.startswith(r+'/') for r in removed),path
    metadata='import importlib.metadata as m,json; print(json.dumps(sorted([(d.metadata["Name"],d.version) for d in m.distributions() if d.metadata["Name"].lower()!="pip"])))'
    assert native(base,metadata)==native(candidate,metadata),'Application distributions changed'
    assert not native(candidate,'import json,importlib.util; print(json.dumps({"pipImportable":importlib.util.find_spec("pip") is not None}))')['pipImportable']
else:
    assert '/usr/local/share/utilibre-language/npm-update.json' in changes
    for path in changes:
        if path in spec.get('removeUnused',{}):
            assert before[path]==spec['removeUnused'][path] and path not in after,path
            continue
        assert path.startswith('/usr/local/lib/node_modules/npm/') or path in ['/usr/local/share/utilibre-language/npm-update.json','/usr/local/etc/npmrc'],path
    # Native application package tree, compiled bundles, launchers and config
    # are byte-identical. Exercise the replacement installer without a registry.
    result=subprocess.check_output(['docker','run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','512m','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,nosuid,size=64m,mode=1777','--workdir','/tmp','-e','HOME=/tmp','--entrypoint','node',candidate,'-'],input=(ROOT/'check-npm.cjs').read_text(),text=True)
    (report/'native-npm.json').write_text(result)
image=json.loads(subprocess.check_output(['docker','image','inspect',candidate],text=True))[0]
subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(report/'trivy.json'),image['Id']],check=True)
scan=json.loads((report/'trivy.json').read_text())
findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
record={'status':'passed','key':args.key,'family':args.family,'image':candidate,'imageId':image['Id'],'verifiedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'unchangedFiles':sum(before.get(p)==v for p,v in after.items()),'changedInstallerFiles':len(changes),'applicationFilesUnchanged':True,'counts':{s:sum(v['Severity']==s for v in findings) for s in ['CRITICAL','HIGH','MEDIUM','LOW','UNKNOWN']},'languageHigh':[{k:v.get(k) for k in ['PkgName','InstalledVersion','VulnerabilityID','FixedVersion']} for r in scan.get('Results',[]) if r.get('Type') in ['python-pkg','node-pkg'] for v in r.get('Vulnerabilities',[]) if v['Severity'] in ['HIGH','CRITICAL']],'productionChanged':False,'limitations':'Exact immutable-image byte and package checks; app workflow gates recorded separately.'}
(report/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps({'report':str(report),**record}))

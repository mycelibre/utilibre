#!/usr/bin/env python3
"""Compare app/asset bytes and recover actual candidate vulnerability results."""
import argparse
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
import time

PINS={
 'kuma':('sha256:3f54318380deeb275b2127133ec0fdd59de12ebe295c58bf3f99174b3f86f475','utilibre-kuma:2.5.6-leaves-security-20261011'),
 'actual':('sha256:b664a7abda3fb06c807995b93013a6acedb59fbfe103e87ccf88da6919f737ca','utilibre-actual:leaves-security-20261011'),
 'actual-rollback':('sha256:b664a7abda3fb06c807995b93013a6acedb59fbfe103e87ccf88da6919f737ca','utilibre-actual:privacy-rollback-20261011'),
}
parser=argparse.ArgumentParser();parser.add_argument('app',choices=PINS);args=parser.parse_args()
base,candidate=PINS[args.app]
report=Path(tempfile.mkdtemp(prefix=args.app+'-leaves-inventory-',dir='/opt/utilibre/reports'))
script=r'''
const fs=require('node:fs'),crypto=require('node:crypto');
const files={};
function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const f=p+'/'+e.name;if(e.name==='node_modules')continue;if(e.isSymbolicLink())files[f]='link:'+fs.readlinkSync(f);else if(e.isDirectory())walk(f);else if(e.isFile())files[f]=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');}}
walk('/app');
if(fs.existsSync('/app/node_modules/@actual-app/web/build'))walk('/app/node_modules/@actual-app/web/build');
console.log(JSON.stringify(files));
'''
def inventory(image):
 # A rollback must also preserve every predecessor dependency byte, not merely
 # the non-dependency application files checked for normal leaf overlays.
 selected=script.replace("if(e.name==='node_modules')continue;",'') if args.app=='actual-rollback' else script
 output=subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--cpus','1','--log-driver','none','--entrypoint','node',image,'-e',selected],text=True)
 return json.loads(output)
before,after=inventory(base),inventory(candidate)
changed=[path for path in before.keys()|after.keys() if before.get(path)!=after.get(path)]
if args.app.startswith('actual'):
 assert set(changed)=={
  '/app/chunks/app-BgMEdvse.js',
  '/app/node_modules/@actual-app/web/build/static/js/index.C1M3OSSF.js',
  '/app/node_modules/@actual-app/web/build/static/js/months.CGSICdiJ.chunk.js',
  '/app/node_modules/@actual-app/web/build/sw.js',
 }, 'Only the four reviewed privacy files may differ'
 receipt=json.loads(subprocess.check_output(['docker','run','--rm','--network','none','--read-only','--entrypoint','node',candidate,'-e','console.log(JSON.stringify(require("/opt/utilibre-reviewed-leaves/privacy-patch.json")))'],text=True))
 assert sorted(changed)==sorted(row['path'] for row in receipt['changes'])
 for row in receipt['changes']:
  assert before[row['path']]==row['beforeSha256'] and after[row['path']]==row['afterSha256']
else: assert before==after, 'Application code or browser assets changed'
configs=json.loads(subprocess.check_output(['docker','image','inspect',base,candidate],text=True))
for key in ['Env','Entrypoint','Cmd','User','WorkingDir','ExposedPorts','Volumes','Healthcheck']:
 assert configs[0]['Config'].get(key)==configs[1]['Config'].get(key),key
subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(report/'trivy.json'),configs[1]['Id']],check=True)
scan=json.loads((report/'trivy.json').read_text())
findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
record={'application':args.app,'image':candidate,'imageId':configs[1]['Id'],'testedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'unchangedApplicationAndAssetFiles':len(after)-len(changed),'reviewedPrivacyPatchedFiles':changed,'assetManifestSha256':hashlib.sha256(json.dumps(after,sort_keys=True).encode()).hexdigest(),'runtimeConfigurationUnchanged':True,'counts':{s:sum(v['Severity']==s for v in findings) for s in ['UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL']},'productionChanged':False,'report':str(report)}
(report/'result.json').write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))

#!/usr/bin/env python3
"""Verify candidate-only native change and actual image Rust dependency inventory."""
import argparse
from pathlib import Path
import hashlib
import json
import subprocess
import tarfile
import tempfile
import time
from stage import SPECS

parser = argparse.ArgumentParser()
parser.add_argument('app',choices=SPECS)
args = parser.parse_args(); spec=SPECS[args.app]
report=Path(tempfile.mkdtemp(prefix=f'{args.app}-auditable-inventory-',dir='/opt/utilibre/reports'))

def inventory(image):
    cid=subprocess.check_output(['docker','create',image],text=True).strip()
    try:
        output=report/(cid+'.tar')
        subprocess.run(['docker','export','--output',str(output),cid],check=True)
        files={}
        with tarfile.open(output) as archive:
            for item in archive:
                if item.name in ['etc/hosts','etc/hostname','etc/resolv.conf',spec['destination'].lstrip('/')]: continue
                if item.isfile(): files[item.name]=hashlib.sha256(archive.extractfile(item).read()).hexdigest()
                elif item.issym(): files[item.name]='link:'+item.linkname
        output.unlink()
        return files
    finally:
        subprocess.run(['docker','rm',cid],check=True,stdout=subprocess.DEVNULL)

before,after=inventory(spec['image']),inventory(spec['candidate'])
assert before==after, 'A non-binary runtime file changed unexpectedly'
configs=json.loads(subprocess.check_output(['docker','image','inspect',spec['image'],spec['candidate']],text=True))
for key in ['Env','Entrypoint','Cmd','User','WorkingDir','ExposedPorts','Volumes']:
    assert configs[0]['Config'].get(key)==configs[1]['Config'].get(key), f'Runtime configuration changed: {key}'
subprocess.run(['/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry',
    '--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln',
    '--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m',
    '--no-progress','--list-all-pkgs','--format','json','--image-src','docker',
    '--output',str(report/'trivy.json'),configs[1]['Id']],check=True)
scan=json.loads((report/'trivy.json').read_text())
rust=[r for r in scan.get('Results',[]) if r.get('Type')=='rustbinary']
assert rust and sum(len(r.get('Packages',[])) for r in rust)>0, 'No actual Rust binary inventory recovered'
findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])]
counts={severity:sum(v['Severity']==severity for v in findings) for severity in ['UNKNOWN','LOW','MEDIUM','HIGH','CRITICAL']}
record={'application':args.app,'imageId':configs[1]['Id'],'testedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
    'unchangedNonBinaryFiles':len(after),'runtimeConfigurationUnchanged':True,
    'rustBinaryPackages':sum(len(r.get('Packages',[])) for r in rust),'counts':counts,
    'scanSha256':hashlib.sha256((report/'trivy.json').read_bytes()).hexdigest(),
    'productionChanged':False,'report':str(report)}
(report/'result.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record))

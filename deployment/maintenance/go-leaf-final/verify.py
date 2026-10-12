"""Binary-only layer parity and actual scanner inventory; no user volumes."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
name = sys.argv[1]
spec = next(s for s in json.loads((HERE/'images.json').read_text()) if s['key']==name)
key = 'wakapi' if name=='wakapi-healthcheck' else name
stage = json.loads((ROOT/(key+'-image.json')).read_text())

def files(image):
    cid = subprocess.check_output(['docker','create','--entrypoint','/bin/true',image],text=True).strip()
    try:
        process = subprocess.Popen(['docker','export',cid],stdout=subprocess.PIPE)
        rows = {}
        with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
            for member in archive:
                path = '/'+member.name.lstrip('./')
                if path in ['/etc/hosts','/etc/hostname','/etc/resolv.conf']:
                    continue
                if member.isfile():
                    digest = hashlib.sha256()
                    source = archive.extractfile(member)
                    while data:=source.read(1024*1024):
                        digest.update(data)
                    rows[path] = digest.hexdigest()
                elif member.issym() or member.islnk():
                    rows[path] = 'link:'+member.linkname
        assert process.wait()==0
        return rows
    finally:
        subprocess.run(['docker','rm',cid],check=True,stdout=subprocess.DEVNULL)

before, after = files(spec['baseId']), files(stage['imageId'])
changed = sorted(p for p in before.keys()|after.keys() if before.get(p)!=after.get(p))
expected = ['/app/healthcheck','/app/wakapi'] if key=='wakapi' else [spec['binary']]
if key=='oauth2-proxy':
    assert before.get('/bin') in ['link:usr/bin','link:/usr/bin']
    assert after.get('/bin')==before['/bin']
    expected=['/usr/bin/oauth2-proxy']
assert changed==expected, changed
scanfile = ROOT/(key+'-scan.json')
subprocess.run(['systemd-run','--quiet','--scope','-p','CPUQuota=100%','-p','MemoryMax=2G',
 '/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security',
 '--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update',
 '--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker',
 '--output',str(scanfile),stage['imageId']],check=True,env={**os.environ,'GOMAXPROCS':'1','GOMEMLIMIT':'512MiB'},stdout=subprocess.DEVNULL)
scan = json.loads(scanfile.read_text())
go = [r for r in scan.get('Results',[]) if r.get('Type')=='gobinary']
stdlib = [p for r in go for p in r.get('Packages',[]) if p.get('Name')=='stdlib']
assert stdlib and all(p['Version']=='v'+spec['compiler'] for p in stdlib)
findings = [v for r in go for v in r.get('Vulnerabilities',[])]
fixable = [v for v in findings if v.get('FixedVersion')]
assert not fixable, [(v['VulnerabilityID'],v['PkgName'],v.get('FixedVersion')) for v in fixable]
assert not [v for v in findings if v['PkgName']=='stdlib']
report = {'imageId':stage['imageId'],'passed':True,'onlyChangedPaths':changed,
          'unchangedFiles':len(after)-len(changed),'compiler':spec['compiler'],
          'unfixedGoFindings':[{'id':v['VulnerabilityID'],'package':v['PkgName'],'version':v['InstalledVersion']} for v in findings],
          'nonGoFindings':[{'id':v['VulnerabilityID'],'package':v['PkgName'],'version':v['InstalledVersion'],'fixed':v.get('FixedVersion')} for r in scan.get('Results',[]) if r.get('Type')!='gobinary' for v in r.get('Vulnerabilities',[])]}
(ROOT/(key+'-verify.json')).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))

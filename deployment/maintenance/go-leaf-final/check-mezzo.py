"""Native local routes and static assets; never query Tenor or a public proxy."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import sys
import requests

ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
IMAGES = ['sha256:f8643c2525c96b3c5708bb737f71759bfc4c01a745301a8a7dbcba609f9c6416',
          'utilibre-mezzo:1.4.0-go-security-20261011']
assert all(a in ['--oct28','--trust-oct28','--inside'] for a in sys.argv[1:])
TRUST='--trust-oct28' in sys.argv
OCT28='--oct28' in sys.argv
assert not (TRUST and OCT28)
if OCT28:
    ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf/output')
    spec=next(s for s in json.loads((Path(__file__).resolve().parent/'../security-20261028/go-helpers-inputs.json').read_text())['rows'] if s['key']=='mezzo')
    IMAGES=[spec['base'],spec['candidate']]
if TRUST:
    ROOT=Path('/var/lib/utilibre-maintenance/security-20261028/trust/mezzo')
    spec=next(s for s in json.loads((Path(__file__).resolve().parent/'../security-20261028/trust-inputs.json').read_text())['rows'] if s['key']=='mezzo')
    IMAGES=[spec['base'],spec['candidate']]
def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE).strip()
def native():
    base = 'http://127.0.0.1:8006'
    session=requests.Session();session.trust_env=False
    for _ in range(60):
        try:
            response = session.get(base+'/', timeout=1)
            if response.status_code == 200: break
        except requests.RequestException: pass
        time.sleep(.1)
    else: raise AssertionError('Mezzo native startup failed')
    assert 'Mezzo' in response.text and '<form' in response.text
    assets = sorted(set(re.findall(r'[/]static/[A-Za-z0-9._/-]+', response.text)))
    assert assets, 'Native frontend assets absent'
    hashes = {}
    for asset in assets:
        resource = session.get(base+asset, timeout=3)
        assert resource.status_code == 200
        hashes[asset] = hashlib.sha256(resource.content).hexdigest()
    for bad in ['http://127.0.0.1/private', 'https://media.tenor.com.evil.invalid/a.gif', 'file:///etc/passwd']:
        assert session.get(base+'/proxy.gif', params={'url': bad}, timeout=3).status_code == 400
    assert session.get(base+'/static/missing-fixture.css', timeout=3).status_code == 404
    return {'staticAssets': hashes, 'unsupportedProxyRejected': True}
if '--inside' in sys.argv:
    print(json.dumps(native()));sys.exit(0)
results = []
for index, image in enumerate(IMAGES):
    name = 'maintenance-mezzo-native-'+str(index)
    try:
        docker('run', '-d', '--name', name, '--network', 'none', '--read-only', '--cap-drop', 'ALL',
               '--security-opt', 'no-new-privileges', '--log-driver', 'none',
               '--memory', '96m', '--cpus', '.5', image)
        pid=docker('inspect','--format','{{.State.Pid}}',name)
        result=json.loads(subprocess.check_output(['nsenter','-t',pid,'-n',sys.executable,str(Path(__file__).resolve()),'--inside'],text=True,timeout=30))
        results.append({'imageId':docker('image','inspect',image,'--format','{{.Id}}'),
                        'version':docker('run','--rm','--network','none',image,'-version'),**result})
    finally:
        try: docker('rm', '-f', name)
        except subprocess.CalledProcessError: pass
assert results[0]['staticAssets'] == results[1]['staticAssets']
assert results[0]['version'] == results[1]['version']
report = {'passed': True, 'imageId': results[1]['imageId'], 'checks': results,
          'network': 'none; fixture enters the isolated loopback namespace',
          'limitation': 'Local frontend/error paths plus upstream scraper fixtures; no live Tenor query.'}
output=ROOT/('application.json' if TRUST else 'mezzo-native.json')
assert not TRUST or not output.exists(), 'Preserve completed assessment'
output.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))

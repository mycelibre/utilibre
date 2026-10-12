"""Native local routes and static assets; never query Tenor or a public proxy."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
import requests

ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
IMAGES = ['sha256:f8643c2525c96b3c5708bb737f71759bfc4c01a745301a8a7dbcba609f9c6416',
          'utilibre-mezzo:1.4.0-go-security-20261011']
def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE).strip()
results = []
for index, image in enumerate(IMAGES):
    name = 'maintenance-mezzo-native-'+str(index)
    base = 'http://127.0.0.1:33143'
    try:
        docker('run', '-d', '--name', name, '--read-only', '--cap-drop', 'ALL',
               '--security-opt', 'no-new-privileges', '--log-driver', 'none',
               '--memory', '96m', '--cpus', '.5', '-p', '127.0.0.1:33143:8006', image)
        for _ in range(60):
            try:
                response = requests.get(base+'/', timeout=1)
                if response.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(.1)
        else:
            raise AssertionError('Mezzo native startup failed')
        assert 'Mezzo' in response.text and '<form' in response.text
        assets = sorted(set(re.findall(r'[/]static/[A-Za-z0-9._/-]+', response.text)))
        assert assets, 'Native frontend assets absent'
        hashes = {}
        for asset in assets:
            resource = requests.get(base+asset, timeout=3)
            assert resource.status_code == 200
            hashes[asset] = hashlib.sha256(resource.content).hexdigest()
        for bad in ['http://127.0.0.1/private', 'https://media.tenor.com.evil.invalid/a.gif', 'file:///etc/passwd']:
            assert requests.get(base+'/proxy.gif', params={'url': bad}, timeout=3).status_code == 400
        assert requests.get(base+'/static/missing-fixture.css', timeout=3).status_code == 404
        results.append({'imageId': docker('image','inspect',image,'--format','{{.Id}}'),
                        'version': docker('run','--rm','--network','none',image,'-version'),
                        'staticAssets': hashes, 'unsupportedProxyRejected': True})
    finally:
        try:
            docker('rm', '-f', name)
        except subprocess.CalledProcessError:
            pass
assert results[0]['staticAssets'] == results[1]['staticAssets']
assert results[0]['version'] == results[1]['version']
report = {'passed': True, 'imageId': results[1]['imageId'], 'checks': results,
          'limitation': 'Local frontend/error paths plus upstream scraper fixtures; no live Tenor query.'}
(ROOT/'mezzo-native.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report))

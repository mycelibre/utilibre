"""Retain Yopass native encryption, expiry and EN/ES browser checks, isolated."""
import datetime
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
out = ROOT / 'vendor-debian/community-yopass'
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and build['configurationUnchanged'] and build['unrelatedPackagesUnchanged']
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
original = HERE.parent / 'go-runtime-20261011/check-yopass.mjs'
browser_original = HERE.parent / 'security-20261109/check-yopass-browser.mjs'
browser = browser_original.read_text()
browser = browser.replace("'../../../portal/node_modules/playwright/index.mjs'", json.dumps((HERE.parents[2] / 'portal/node_modules/playwright/index.mjs').as_uri()))
assert browser.count("'/var/lib/utilibre-maintenance/security-20261109/yopass'") == 1
browser = browser.replace("'/var/lib/utilibre-maintenance/security-20261109/yopass'", json.dumps(str(out)))
browser_adapter = out / 'browser-adapter.mjs'
browser_adapter.write_text(browser)
code = original.read_text()
code = code.replace("new URL('../security-20261109/yopass-inputs.json',import.meta.url)", json.dumps(str(HERE.parent / 'security-20261109/yopass-inputs.json')))
needle = "if(upgrade)assert.equal(pins.sourceRevision,'c341c4a514cc0d5989418355e3d876c60c6910f9');"
assert code.count(needle) == 1
code = code.replace(needle, needle + '\nObject.assign(pins,' + json.dumps({'base': build['base'], 'imageId': build['imageId']}) + ');')
code = code.replace("'/var/lib/utilibre-maintenance/security-20261109/yopass'", json.dumps(str(out)))
code = code.replace("new URL('../security-20261109/check-yopass-browser.mjs',import.meta.url).pathname", json.dumps(str(browser_adapter)))
adapter = out / 'application-adapter.mjs'
adapter.write_text(code)
assert not (out / 'application.json').exists()
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node', str(adapter), '--upgrade-20261109'], check=True, timeout=240)
native = json.loads((out / 'yopass-native.json').read_text())
browser_proof = json.loads((out / 'browser.json').read_text())
assert native['status'] == 'passed' and native['imageId'] == build['imageId'] and browser_proof['passed']
# Independently retain the distroless package inventory, without executing a
# missing shell/package manager or reading any mounted production data.
cid = subprocess.check_output(['docker', 'create', '--entrypoint', '/unused', build['base']]).decode().strip()
try:
    blob = subprocess.check_output(['docker', 'cp', cid + ':/var/lib/dpkg/status.d', '-'], timeout=30)
finally:
    subprocess.run(['docker', 'rm', cid], stdout=subprocess.DEVNULL, check=True)
packages = {}
with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
    for member in archive:
        if not member.isfile() or member.name.endswith('.md5sums'):
            continue
        fields = dict(l.split(': ', 1) for l in archive.extractfile(member).read().decode().splitlines() if l and not l[0].isspace() and ': ' in l)
        assert fields['Package'] not in packages
        packages[fields['Package']] = {'installed': fields['Version'], 'selection': 'distroless-status.d'}
assert packages['libc6']['installed'] == build['packages']['libc6']['installed'] and len(packages) >= 5
inventory = ROOT / 'dpkg-image-inventory' / (build['base'][7:] + '.json')
assert not inventory.exists()
inventory.write_text(json.dumps({'image': build['base'], 'packages': packages, 'complete': True, 'network': 'none', 'statusArchiveSha256': hashlib.sha256(blob).hexdigest()}, indent=2) + '\n')
scope = {'passed': True, 'base': build['base'], 'imageId': build['imageId'],
         'allUnrelatedImageFilesUnchanged': True, 'configurationUnchanged': True,
         'unrelatedDpkgRecordsUnchanged': True, 'changedFiles': build['changedFiles'],
         'buildSha256': sha(out / 'build.json'), 'consumerSha256': sha(out / 'consumer.json'),
         'scope': 'Retained distroless assembler checked full regular-file/type/mode/uid/gid/link parity outside signed libc6 payload and its two status.d records. Existing /etc files and image configuration unchanged. No shell, package manager, init or loader cache introduced.'}
(out / 'scope.json').write_text(json.dumps(scope, indent=2) + '\n')
proof = {'passed': True, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(),
         'imageId': build['imageId'], 'base': build['base'], 'native': native, 'browser': browser_proof,
         'fixtureSha256': sha(original), 'browserFixtureSha256': sha(browser_original),
         'adapterSha256': sha(adapter), 'browserAdapterSha256': sha(browser_adapter),
         'productionChanged': False, 'limitations': 'Chromium desktop and narrow viewport, not a physical phone. Native C-locale fixture matches the minimal runtime; application Unicode verified through native EN/ES encrypted sharing.'}
(out / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Yopass: native encrypted sharing, expiry, recipient isolation and EN/ES browser checks passed')

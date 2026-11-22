"""Carry only unexpired Debian package reviews to the exact repaired Rallly image.

The entire OS filesystem and installed-package metadata are byte-identical.
Compiled application and Effect findings are never inherited by this reviewer.
"""
import datetime as dt
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/rallly-effect')
MAINT = ROOT.parents[1]
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
prior_scan = read(ROOT / 'pre-release-security.json')
prior_queue = read(ROOT / 'pre-release-security-queue.json')
scan = read(MAINT / 'security.json')
queue = read(MAINT / 'security-queue.json')
stage = read(ROOT / 'stage-v2.json')
scope = read(ROOT / 'scope-v2.json')
gate = read(ROOT / 'scan-gate.json')
native = read(ROOT / 'native.json')
release = read(ROOT / 'release.json')
publication = read(ROOT / 'source-publication.json')
assert not (ROOT / 'retained-reviewed-batch.json').exists()
assert prior_scan['status'] == scan['status'] == 'checked'
assert prior_queue['status'] == queue['status'] == 'current'
assert prior_scan['completedAt'] == prior_queue['scanDate']
assert scan['completedAt'] == queue['scanDate']
assert prior_scan['database']['updatedAt'] == scan['database']['updatedAt']
assert prior_scan['scannerSha256'] == scan['scannerSha256']
assert all(x['passed'] for x in (stage, scope, gate, native, release, publication))
assert stage['imageId'] == scope['imageId'] == gate['imageId'] == native['imageId'] == release['newImage'] == publication['imageId']
assert scope['allOtherImageFilesUnchanged'] and gate['completePackageInventoryPreserved']
assert scope['base'] == release['oldImage'] == stage['base']
assert release['date'] < scan['completedAt']
assert publication['sha256'] == release['sourceSha256']
assert subprocess.check_output(
    ['docker', 'inspect', '--format', '{{.Image}} {{.State.Health.Status}}',
     'utilibre-community-rallly-1'], timeout=20
).decode().strip() == stage['imageId'] + ' healthy'
role = ['utilibre-community-rallly-1']
old_image = next(x for x in prior_scan['images'] if x['id'] == stage['base'])
new_image = next(x for x in scan['images'] if x['id'] == stage['imageId'])
assert old_image['status'] == new_image['status'] == 'checked'
assert old_image['containers'] == new_image['containers'] == role

def identity(item):
    return tuple(item[k] for k in ('id', 'package', 'installed', 'severity', 'type'))

old = {}
for item in prior_queue['items']:
    if item['artifact'] != stage['base'] or item['scope'] != 'runtime-image' or item['type'] != 'debian':
        continue
    old.setdefault(identity(item), []).append(item)

now = dt.datetime.now(dt.timezone.utc)
decisions = []
for item in queue['items']:
    if item['artifact'] != stage['imageId'] or item['scope'] != 'runtime-image' or item['type'] != 'debian' or item['status'] != 'needs-review':
        continue
    assert item['containers'] == role
    matches = old.get(identity(item), [])
    if len(matches) != 1:
        continue
    prior = matches[0]
    decision = prior.get('decision') or {}
    if prior['status'] not in ('mitigated', 'not-affected') or decision.get('status') != prior['status'] or decision.get('condition'):
        continue
    expiry = dt.datetime.fromisoformat(decision['expiresAt'].replace('Z', '+00:00'))
    if expiry <= now:
        continue
    decisions.append({
        'key': item['key'], 'status': prior['status'], 'expiresAt': decision['expiresAt'],
        'reason': f'Carry exact {prior["status"]} decision {prior["key"]} from SHA-bound pre-release queue {sha(ROOT / "pre-release-security-queue.json")}. '
                  f'Rallly release {sha(ROOT / "release.json")} is live; full image proof {sha(ROOT / "scope-v2.json")} shows the Debian package files and metadata unchanged. '
                  f'Frozen scan {sha(ROOT / "scan-gate.json")} preserves the package inventory and adds no finding; current scanner and advisory database match the prior scan. '
                  'The original review evidence and expiry are preserved. This does not review changed compiled app or Effect files.'
    })
assert decisions, 'No transferable exact Debian decisions'
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'], 'decisions': sorted(decisions, key=lambda x: x['key']),
         'priorQueueSha256': sha(ROOT / 'pre-release-security-queue.json'),
         'scopeSha256': sha(ROOT / 'scope-v2.json'),
         'releaseSha256': sha(ROOT / 'release.json'),
         'originalExpiryPreserved': True, 'changedApplicationNotInherited': True}
(ROOT / 'retained-reviewed-batch.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(decisions), 'applied': False,
                  'onlyUnchangedDebianPackages': True}))

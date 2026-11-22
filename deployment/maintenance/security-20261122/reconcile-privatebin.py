"""Record a completed, tested runtime transition; never restart PrivateBin."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
read = lambda p: json.loads(p.read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
policy_path = REPO / 'deployment/utilibre/privatebin-updater/policy.json'
policy = read(policy_path)
assert sys.argv[1:] in ([], ['--xml'])
xml = sys.argv[1:] == ['--xml']
directory = ROOT / ('xml-successor/images/privatebin' if xml else 'vendor/privatebin')
build = read(directory / 'build.json')
scope = read(directory / 'scope.json')
release_path = ROOT / ('xml-successor/images/release.json' if xml else 'vendor/release-completed-6.json')
release = read(release_path)
assert release['status'] == 'passed'
group = next(g for g in release['groups'] if g['key'] == 'privatebin')
assert group['status'] == 'passed' and len(group['rows']) == 1
assert group['rows'][0]['newImage'] == build['imageId']
assert build['passed'] and build['configurationUnchanged']
assert scope['passed'] and scope['allUnrelatedImageFilesUnchanged']
assert scope['configurationUnchanged'] and scope['muslUnchanged']
assert sha(directory / 'scope.json') == build['scopeSha256']
old = policy['reviewedRuntimeTransition']
assert policy['runtimeImage'] in (build['base'], build['imageId'])
name = 'utilibre-services-privatebin-1'
assert subprocess.check_output(['docker', 'inspect', '--format', '{{.Image}}', name], text=True).strip() == build['imageId']
paths = list(old['payloadHashes'])
lines = subprocess.check_output(['docker', 'exec', name, 'sha256sum', *paths], text=True).splitlines()
payload = {s.split(None, 1)[1]: s.split(None, 1)[0] for s in lines}
assert payload == old['payloadHashes']
source = json.loads(subprocess.check_output(['docker', 'exec', name, 'cat', '/usr/share/doc/privatebin/utilibre-release.json'], text=True))
for key in ('version', 'revision', 'archiveSha256'):
    assert source[key] == old[key]
evidence = {
    'native': directory / 'application.json',
    'deployment': release_path,
    'runtimeBuild': directory / 'build.json',
    'runtimeConsumer': directory / ('consumer.json' if xml else 'application.json'),
    'runtimeScan': directory / 'scan-gate.json',
    'sourceReplay': directory / 'scope.json',
}
for kind, path in evidence.items():
    assert (read(path).get('status') == 'passed') if kind == 'deployment' else read(path)['passed']
scanner = Path('/opt/utilibre/maintenance/bin/trivy')
assert sha(scanner) == read(evidence['runtimeScan'])['scannerSha256']
policy.update(runtimeImage=build['imageId'], scannerVersion='0.76.2', scannerSha256=sha(scanner))
policy['reviewedRuntimeTransition'] = {
    **old, 'previousImage': build['base'], 'image': build['imageId'],
    'deployedAt': group['completedAt'],
    'purpose': ('Tested libxml2 vendor update' if xml else 'Tested PHP/OpenSSL/Nginx vendor update') + '; identical PrivateBin 2.1.1 source, privacy configuration, upload guard and template. Reconciliation only.',
    'evidence': {k: {'path': str(p.relative_to(ROOT.parent)), 'sha256': sha(p)} for k, p in evidence.items()},
}
policy_path.write_text(json.dumps(policy, indent=2) + '\n')
print('PrivateBin runtime policy records the tested deployment; no activation.')

"""Exact installed FreeType backport review on the current Penpot exporter."""
import datetime as dt
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance')
DHI = ROOT / 'security-20261122/dhi-successors'
CURRENT = ROOT / 'security-20261122/vendor-debian/expanded-penpot-exporter-glibc'
CONTAINER = 'utilibre-expanded-penpot-exporter-1'
IMAGE = 'sha256:b6d52037f225436ad0c5ed4130aef591a09048a9c71cd3feaaabf4928954ea20'
VERSION = '2.13.3+dfsg-1+deb13u1+dhi1'
ID = 'CVE-2026-95512'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
def command(*args):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=40).strip()

def main():
    spec = importlib.util.spec_from_file_location('payload', HERE / 'review-glibc.py')
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert scan['completedAt'] == queue['scanDate']
    assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    assert command('docker', 'inspect', '--format', '{{.Image}} {{.State.Running}}', CONTAINER) == IMAGE + ' true'
    observed = next(x for x in scan['images'] if x['id'] == IMAGE)
    assert observed['status'] == 'checked' and observed['containers'] == [CONTAINER]
    inputs = read(HERE / 'dhi-successor-inputs.json')
    pin = inputs['packages']['dhi/libfreetype6']
    assert pin['name'] == 'libfreetype6' and pin['version'] == VERSION
    row = next(x for x in inputs['rows'] if x['key'] == 'expanded-penpot-exporter')
    assert row['packages']['libfreetype6']['package'] == 'dhi/libfreetype6'
    original = DHI / 'vendor-debian/expanded-penpot-exporter'
    previous_build, previous_scope = [read(original / name) for name in ('build.json', 'scope.json')]
    current_build, current_scope, app, release = [read(CURRENT / name) for name in
                                                   ('build.json', 'scope.json', 'application.json', 'release-utilibre-expanded.json')]
    assert all(x['passed'] for x in (previous_build, previous_scope, current_build, current_scope, app))
    assert previous_scope['allUnrelatedImageFilesUnchanged'] and previous_scope['unrelatedDpkgRecordsUnchanged']
    assert current_scope['allUnrelatedImageFilesUnchanged'] and current_scope['unrelatedDpkgRecordsUnchanged']
    assert previous_build['imageId'] == current_build['base'] == current_scope['base']
    assert current_build['imageId'] == current_scope['imageId'] == app['imageId'] == IMAGE
    assert next(x for x in previous_build['pins'] if x['name'] == 'libfreetype6')['sha256'] == pin['sha256']
    assert all(x['name'] != 'libfreetype6' for x in current_build['pins'])
    assert release['status'] == 'passed' and release['group']['status'] == 'passed' and release['completedAt'] < scan['completedAt']
    assert len(release['group']['rows']) == 1 and release['group']['rows'][0]['name'] == CONTAINER
    assert release['group']['rows'][0]['newImage'] == IMAGE
    source = read(DHI / 'source/acquired.json')
    assert source['productionChanged'] is False and sha(DHI / 'source/acquired.json') == read(DHI / 'source/retained-fixes.json')['sourceAcquisitionSha256']
    files = next(x['files'] for x in source['sources'] if x['version'] == VERSION)
    assert {x['file'] for x in files} == {f'freetype_{VERSION}.dsc', f'freetype_{VERSION}.debian.tar.xz'}
    for row_file in files:
        assert sha(DHI / 'source' / row_file['file']) == row_file['sha256']
    patch_path = 'debian/patches/dhi-cve-2026-95512-cid-read-subrs-overlap-limit.patch'
    with tarfile.open(DHI / 'source' / f'freetype_{VERSION}.debian.tar.xz') as archive:
        assert patch_path.removeprefix('debian/patches/') in archive.extractfile('debian/patches/series').read().decode().splitlines()
        patch = archive.extractfile(patch_path).read()
        assert b'cum_len / 4 > stream->size' in patch and b'f3ca71c9900fe860849b3163a6e2c1e765b291d9' in patch
    helper.ROOT = DHI
    helper.VERSION = VERSION
    payload = helper.payload(pin)
    assert command('docker', 'exec', CONTAINER, 'dpkg-query', '-W', '-f=${Version}', 'libfreetype6') == VERSION
    lines = command('docker', 'exec', CONTAINER, 'sha256sum', *payload['files']).splitlines()
    actual = {line.split(maxsplit=1)[1]: line.split(maxsplit=1)[0] for line in lines}
    helper.verify_hashes(payload['files'], actual)
    for path, target in payload['links'].items():
        assert command('docker', 'exec', CONTAINER, 'readlink', path) == target
    assert command('docker', 'inspect', '--format', '{{.Image}}', CONTAINER) == IMAGE
    items = [x for x in queue['items'] if x['status'] == 'needs-review' and x['scope'] == 'runtime-image'
             and x['artifact'] == IMAGE and x['containers'] == [CONTAINER] and x['type'] == 'debian'
             and x['id'] == ID and x['package'] == 'libfreetype6' and x['installed'] == VERSION]
    assert len(items) == 1
    output = ROOT / 'security-20261122/freetype-exporter-review.json'
    assert not output.exists()
    reason = (f'Exact signed DHI libfreetype6 {VERSION} payload and symlinks match the running Penpot exporter. '
              f'Its authenticated source includes the upstream CID overlap-limit fix for {ID}; both complete image comparisons preserve the installed FreeType bytes after the current release. '
              'The isolated accented-font application check passed. This decision covers this package and advisory only; other FreeType findings are untouched. '
              f'Raw scanner match retained. https://security-tracker.debian.org/tracker/{ID}')
    expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
    output.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'],
        'decisions': [{'key': items[0]['key'], 'status': 'mitigated',
                       'reason': reason, 'expiresAt': expiry}],
        'packageSha256': pin['sha256'], 'sourcePatchSha256': hashlib.sha256(patch).hexdigest(),
        'currentScopeSha256': sha(CURRENT / 'scope.json'),
        'priorScopeSha256': sha(original / 'scope.json'),
        'productionChanged': False}, indent=2) + '\n')
    print(json.dumps({'prepared': 1, 'productionChanged': False}))

if __name__ == '__main__':
    main()

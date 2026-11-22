"""Read-only, exact installed DHI fontenc review after the Penpot release."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
FONT = ROOT / 'security-20261122/fontenc'
BUILD = ROOT / 'security-20261122/vendor-debian/expanded-penpot-exporter-glibc'
CONTAINER = 'utilibre-expanded-penpot-exporter-1'
VERSION = '1:1.1.8-1+deb13u0+dhi1'
LIBRARY = '/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def command(*args):
    return subprocess.check_output(args, text=True, timeout=15).strip()


def main():
    scan, queue = [read(ROOT / name) for name in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert scan['completedAt'] == queue['scanDate']
    age = dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00'))
    assert dt.timedelta(0) <= age < dt.timedelta(days=1)
    image = command('docker', 'inspect', '--format', '{{.Image}}', CONTAINER)
    assert image == 'sha256:b6d52037f225436ad0c5ed4130aef591a09048a9c71cd3feaaabf4928954ea20'
    assert command('docker', 'inspect', '--format', '{{.State.Running}}', CONTAINER) == 'true'
    assert any(i['id'] == image and i['status'] == 'checked' for i in scan['images'])
    build, scope, app, release = [read(BUILD / name) for name in
                                  ('build.json', 'scope.json', 'application.json', 'release-utilibre-expanded.json')]
    assert build['passed'] and scope['passed'] and app['passed'] and release['status'] == 'passed'
    assert all(x['imageId'] == image for x in (build, scope, app))
    assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
    assert release['completedAt'] < scan['completedAt']
    assert len(release['group']['rows']) == 1 and release['group']['rows'][0]['name'] == CONTAINER
    assert release['group']['rows'][0]['newImage'] == image
    pin = next(p for p in build['pins'] if p['name'] == 'libfontenc1')
    assert pin['version'] == VERSION
    acquired = read(FONT / 'dhi-source/authenticated.json')
    assert acquired['source'] == 'libfontenc' and acquired['version'] == VERSION
    assert acquired['productionChanged'] is False
    for row in acquired['files']:
        path = FONT / 'dhi-source' / row['file']
        assert path.stat().st_size == row['bytes'] and sha(path) == row['sha256']
    package = FONT / 'dhi-source/libfontenc1_1.1.8-1+deb13u0+dhi1_amd64.deb'
    assert sha(package) == pin['sha256']
    source_scope = FONT / 'build-v5/source-scope.json'
    native = read(FONT / 'dhi-native/native.json')
    assert native['passed'] and native['network'] == 'none' and native['productionChanged'] is False
    assert native['vendorVersion'] == VERSION and native['sourceScopeSha256'] == sha(source_scope)
    assert set(native['checks']) == {'ordinary API', 'boundary .enc', 'source patch parity'}
    assert read(source_scope)['changed'].keys() == {'src/encparse.c'}
    with tarfile.open(FONT / 'dhi-source/libfontenc_1.1.8-1+deb13u0+dhi1.tar.gz') as archive:
        patch = archive.extractfile('libfontenc/debian/patches/dhi-cve-2026-109908-encparse-setcode-bounds.patch').read()
        assert b'5920c6ee144fffff84b62f5b479171f734f15316' in patch
    assert command('docker', 'exec', CONTAINER, 'dpkg-query', '-W', '-f=${Version}', 'libfontenc1') == VERSION
    assert command('docker', 'exec', CONTAINER, 'sha256sum', LIBRARY).split()[0] == native['vendorLibrarySha256']
    assert app['librarySha256'] == native['vendorLibrarySha256']
    assert app['fontNativeSha256'] == sha(BUILD / 'font-native.json')
    assert command('docker', 'inspect', '--format', '{{.Image}}', CONTAINER) == image
    items = [i for i in queue['items'] if i['status'] == 'needs-review'
             and i['severity'] == 'HIGH' and i['scope'] == 'runtime-image'
             and i['artifact'] == image and i['containers'] == [CONTAINER]
             and i['package'] == 'libfontenc1' and i['installed'] == VERSION
             and i['id'] == 'CVE-2026-109908']
    assert len(items) == 1
    reason = (f'Exact installed Penpot exporter libfontenc1 {VERSION} library SHA256 '
              f'{native["vendorLibrarySha256"]} matches the signed DHI archive. Its '
              'source contains upstream encoding bounds fix 5920c6ee144fffff84b62f5b479171f734f15316; '
              'the isolated ordinary and boundary API checks, accented raster parity, '
              'complete unrelated-file scope and exact completed release passed. '
              'This covers only CVE-2026-109908 in this image, not other packages. '
              'Raw finding retained. https://security-tracker.debian.org/tracker/CVE-2026-109908')
    out = ROOT / 'security-20261122/fontenc-exporter-review.json'
    expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat().replace('+00:00', 'Z')
    out.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'],
                               'sourceArchiveSha256': sha(FONT / 'dhi-source/libfontenc_1.1.8-1+deb13u0+dhi1.tar.gz'),
                               'packageArchiveSha256': sha(package), 'releaseSha256': sha(BUILD / 'release-utilibre-expanded.json'),
                               'decisions': [{'key': items[0]['key'], 'status': 'mitigated', 'reason': reason,
                                              'expiresAt': expiry}]}, indent=2) + '\n')
    print(json.dumps({'prepared': 1, 'productionChanged': False, 'report': str(out)}))


if __name__ == '__main__':
    main()

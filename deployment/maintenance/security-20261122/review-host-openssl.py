"""Eight proven host crypto backports only; proposals, never silent acceptance.

The separate APT inventory drift and two vendor-open crypto advisories remain
open. Recheck installed bytes and mapped consumers, not merely dpkg versions.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
VERSION = '3.5.9-1~deb13u1+utilibre1'
PACKAGES = {'libssl3t64', 'openssl-provider-legacy', 'openssl', 'libssl-dev'}
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())


def eligible(item, ids):
    return (item.get('status') == 'needs-review' and item.get('scope') == 'host-os'
            and item.get('artifact') == 'host-dpkg' and item.get('type') == 'debian'
            and item.get('package') in PACKAGES and item.get('installed') == VERSION
            and item.get('id') in ids and not item.get('containers'))


def main():
    os.umask(0o077)
    output = ROOT / 'host-openssl/backport-review.json'
    assert not output.exists(), 'Preserve previous review evidence'
    source = read(HERE / 'openssl-inputs.json')
    inputs = read(HERE / 'openssl-runtime-inputs.json')
    built = read(ROOT / 'openssl-build-v2/built.json')
    proof = read(ROOT / 'host-openssl/activated-component.json')
    release = ROOT / 'host-openssl/release.json'
    assert proof['passed'] and proof['version'] == VERSION and proof['oldHostCryptoConsumers'] == 0
    assert not proof['wholeHostReleaseGatePassed'] and len(proof['independentPackageChanges']) == 21
    assert sha(release) == proof['releaseSha256']
    assert sha(ROOT / 'host-openssl/prepared.json') == proof['preparedSha256']
    assert sha(ROOT / 'openssl-build-v2/built.json') == proof['sourceBuildSha256'] == inputs['sourceBuildSha256']
    assert built['passed'] and built['network'] == 'none' and not built['deployed']
    assert built['patches'] == source['patches'] and len(source['patches']) == 8
    assert sha(ROOT / 'openssl-build-v2/build.log') == built['artifacts']['build.log']
    assert re.search(r'Files=347, Tests=4932, [^\n]*\nResult: PASS', (ROOT / 'openssl-build-v2/build.log').read_text())
    ids = {p['advisory']: p for p in source['patches']}
    assert len(ids) == 8 and not {'CVE-2026-84786', 'CVE-2026-95690'} & ids.keys()
    archive = ROOT / 'openssl-build-v2' / ('openssl_' + VERSION + '.debian.tar.xz')
    assert sha(archive) == built['artifacts'][archive.name]
    with tarfile.open(archive) as tar:
        for patch in source['patches']:
            blob = tar.extractfile('debian/patches/utilibre-' + patch['file']).read()
            assert hashlib.sha256(blob).hexdigest() == patch['sha256']
    offer = read(ROOT / 'openssl-source-offer.json')
    assert offer['passed'] and offer['published'] and offer['sourceBuildSha256'] == inputs['sourceBuildSha256']
    assert sha(ROOT / offer['file']) == offer['sha256']
    assert sha('/etc/ssl/openssl.cnf') == proof['configurationSha256']
    for name in PACKAGES:
        assert subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', name], text=True, timeout=15) == VERSION
    for row in proof['payloads']:
        p = Path(row['file'])
        if row['file'].startswith('/etc/'):
            continue
        if 'link' in row:
            assert p.is_symlink() and os.readlink(p) == row['link']
        else:
            assert not p.is_symlink() and sha(p) == row['sha256']
    own = Path('/').stat()
    for p in Path('/proc').iterdir():
        if not p.name.isdigit():
            continue
        try:
            r = (p / 'root').stat()
            if (r.st_dev, r.st_ino) == (own.st_dev, own.st_ino):
                assert not any(re.search(r'/(libssl|libcrypto)\.so\.3\s+\(deleted\)$', line)
                               for line in (p / 'maps').read_text().splitlines())
        except (FileNotFoundError, ProcessLookupError):
            pass
    scan, queue = [read(ROOT.parent / f) for f in ('security.json', 'security-queue.json')]
    now = dt.datetime.now(dt.timezone.utc)
    assert scan['status'] == 'checked' and queue['status'] == 'current'
    assert queue['scanDate'] == scan['completedAt'] and proof['date'] < scan['completedAt']
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    decisions = []
    for item in queue['items']:
        if not eligible(item, ids):
            continue
        patch = ids[item['id']]
        decisions.append({'key': item['key'], 'status': 'mitigated',
            'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
            'reason': f"Installed host {item['package']} {VERSION} matches the exact native packages built with upstream repair {patch['commit']} for {item['id']}. Source/patch hashes and all 4932 upstream tests are verified; eight native crypto operations and candidate SSH configuration checks passed. The actual reboot activated these bytes: no host process maps a deleted predecessor crypto library. Current file hashes and symlinks were rechecked. This scoped component proof preserves the original whole-host inventory gate failure from 21 independent APT changes; it does not approve those changes or clear unrelated CVEs. Per-advisory exploit reproduction is not claimed. Evidence: security-20261122/host-openssl/activated-component.json and backport-review.json. https://openssl-library.org/news/vulnerabilities-3.5/"})
    assert read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
    output.write_text(json.dumps({'date': now.isoformat(), 'scanDate': scan['completedAt'],
        'decisions': decisions, 'applied': False, 'productionChanged': False,
        'componentSha256': sha(ROOT / 'host-openssl/activated-component.json'),
        'sourceBuildSha256': inputs['sourceBuildSha256'], 'remainingOpenIds': ['CVE-2026-84786', 'CVE-2026-95690']}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'applied': False}))


if __name__ == '__main__':
    main()

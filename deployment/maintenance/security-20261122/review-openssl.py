"""Review eight exact backports against current deployed package bytes.

Read-only and finite. The other two open OpenSSL records remain unresolved.
No scanner severities, raw matches, services or triage decisions are modified.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import re
import io
import importlib.util

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
RUNTIME = ROOT / 'openssl-runtime'
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())
run = lambda args: subprocess.check_output(args, text=True, timeout=45).strip()


def distroless_version(packed, package, version):
    """Validate one named package record; never execute its content."""
    assert len(packed) < 1024 * 1024
    with tarfile.open(fileobj=io.BytesIO(packed)) as archive:
        entries = list(archive)
        assert len(entries) == 1 and entries[0].isfile()
        assert entries[0].name == package and entries[0].size < 128 * 1024
        record = archive.extractfile(entries[0]).read().decode()
    for field, expected in (('Package', package), ('Version', version)):
        values = re.findall(r'^' + field + r': (.+)$', record, re.M)
        assert values == [expected]


def main():
    global RUNTIME
    assert sys.argv[1:] in ([], ['--fips'], ['--penpot'], ['--extra'], ['--relay'], ['--distroless'])
    profile = sys.argv[1][2:] if len(sys.argv) == 2 else None
    fips = profile == 'fips'
    suffix = '-' + profile if profile else ''
    RUNTIME = ROOT / ('openssl' + suffix + '-runtime')
    build_dir = ROOT / ('openssl-fips-build' if fips else 'openssl-build-v2')
    output = ROOT / ('openssl' + suffix + '-review.json')
    inputs = read(HERE / ('openssl' + suffix + '-runtime-inputs.json'))
    source = read(HERE / ('openssl-fips-inputs.json' if fips else 'openssl-inputs.json'))
    built = read(build_dir / 'built.json')
    assert sha(build_dir / 'built.json') == inputs['sourceBuildSha256']
    assert built['passed'] and built['network'] == 'none' and not built['deployed']
    assert sha(build_dir / 'build.log') == built['artifacts']['build.log']
    assert re.search(r'Files=347, Tests=4932, [^\n]*\nResult: PASS', (build_dir / 'build.log').read_text())
    assert built['patches'] == source['patches'] and len(source['patches']) == (9 if fips else 8)
    ids = {p['advisory']: p for p in source['patches'] if 'advisory' in p}
    assert len(ids) == 8 and not {'CVE-2026-84786', 'CVE-2026-95690'} & ids.keys()
    version = source['candidateVersion']
    native_source = build_dir / ('openssl_' + version + '.debian.tar.xz')
    assert sha(native_source) == built['artifacts'][native_source.name]
    with tarfile.open(native_source) as archive:
        for patch in source['patches']:
            blob = archive.extractfile('debian/patches/utilibre-' + patch['file']).read()
            assert hashlib.sha256(blob).hexdigest() == patch['sha256']
    offer = read(ROOT / ('openssl-fips-source-offer.json' if fips else 'openssl-source-offer.json'))
    assert offer['passed'] and offer['published'] and offer['sourceBuildSha256'] == inputs['sourceBuildSha256']
    assert sha(ROOT / offer['file']) == offer['sha256']
    scan, queue = [read(ROOT.parent / f) for f in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and queue['status'] == 'current' and scan['completedAt'] == queue['scanDate']
    now = dt.datetime.now(dt.timezone.utc)
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    release = read(RUNTIME / 'vendor-debian/release.json')
    assert release['status'] == 'passed' and release['completedAt'] <= scan['completedAt']
    for receipt in release['sourceReceipts']:
        assert sha(receipt['path']) == receipt['sha256']
    deployed, proofs = {}, []
    for row in inputs['rows']:
        if row['releaseApproval'] != 'approved':
            continue
        out = RUNTIME / 'vendor-debian' / row['key']
        b = read(out / 'build.json')
        for name, digest in row['reviewedEvidence'].items():
            assert sha(out / name) == digest
        for name in ('native-tls.json', 'upstream-regression.json'):
            assert sha(out / name) == row['opensslEvidence'][name]
            proof = read(out / name)
            assert proof['passed'] and proof['imageId'] == b['imageId'] and proof['base'] == row['base']
        if profile == 'distroless':
            assert row['key'] == 'community-yopass'
            assert sha(out / 'distroless-abi.json') == row['opensslEvidence']['distroless-abi.json']
            abi = read(out / 'distroless-abi.json')
            assert abi['passed'] and abi['bothLibraryAbisPreserved']
            assert abi['base'] == row['base'] and abi['imageId'] == b['imageId']
        if fips:
            assert sha(out / 'fips-native.json') == row['opensslEvidence']['fips-native.json']
            provider = read(out / 'fips-native.json')
            assert provider['passed'] and provider['imageId'] == b['imageId'] and provider['base'] == row['base']
        assert row['opensslEvidence']['sourceArchiveSha256'] == offer['sha256']
        groups = [g for g in release['groups'] if g['key'] == row['key']]
        roles = [role for g in groups for role in g['rows'] if role['newImage'] == b['imageId']]
        assert {r['name'] for r in roles} == set(row['containers'])
        for name in row['containers']:
            assert run(['docker', 'inspect', '--format', '{{.Image}}', name]) == b['imageId']
            if profile == 'penpot':
                private = row['privateLibrary']
                assert private['path'] == '/opt/imagick/lib/deps/libcrypto.so.3'
                assert run(['docker', 'exec', name, 'sha256sum', private['path']]).split()[0] == private['afterSha256']
        payloads = {}
        for name, selected in row['packages'].items():
            pin = inputs['packages'][selected['package']]
            deb = RUNTIME / 'debian-acquisition' / pin['file']
            assert pin['version'] == version and sha(deb) == pin['sha256'] == built['artifacts'][pin['file']]
            files, links = {}, {}
            with tempfile.TemporaryDirectory(prefix='openssl-payload-', dir=ROOT) as tmp:
                subprocess.run(['dpkg-deb', '-x', str(deb), tmp], check=True, timeout=30)
                for base, dirs, names in os.walk(tmp):
                    for filename in dirs + names:
                        path = Path(base) / filename
                        relative = '/' + str(path.relative_to(tmp))
                        if not relative.startswith('/usr/') or relative.startswith('/usr/share/'):
                            continue
                        if path.is_symlink():
                            links[relative] = os.readlink(path)
                        elif path.is_file():
                            files[relative] = sha(path)
            assert files
            for container in row['containers']:
                if profile == 'distroless':
                    assert name == 'libssl3t64'
                    packed = subprocess.check_output(['docker', 'cp', container + ':/var/lib/dpkg/status.d/' + name, '-'], timeout=30)
                    distroless_version(packed, name, version)
                    spec = importlib.util.spec_from_file_location('crypto_payload', HERE / 'review-glibc.py')
                    helper = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(helper)
                    helper.distroless_payload(container, {'files': files, 'links': links})
                    continue
                assert run(['docker', 'exec', container, 'dpkg-query', '-W', '-f=${Version}', name]) == version
                result = run(['docker', 'exec', container, 'sha256sum', *files]).splitlines()
                assert len(result) == len(files)
                assert all(line.split(maxsplit=1)[0] == digest for line, digest in zip(result, files.values()))
                for path, target in links.items():
                    assert run(['docker', 'exec', container, 'readlink', path]) == target
            payloads[name] = {'archiveSha256': pin['sha256'], 'files': files, 'links': links}
        assert b['imageId'] not in deployed
        deployed[b['imageId']] = {'key': row['key'], 'containers': row['containers'], 'payloads': payloads}
        proofs.append({'key': row['key'], 'imageId': b['imageId'], 'evidence': row['reviewedEvidence'],
                       'cryptoEvidence': row['opensslEvidence'], 'payloads': payloads})
    decisions = []
    for item in queue['items']:
        if (item['status'] != 'needs-review' or item['scope'] != 'runtime-image' or item['type'] != 'debian'
                or item['installed'] != version or item['id'] not in ids or item['artifact'] not in deployed):
            continue
        target = deployed[item['artifact']]
        assert set(item['containers']) == set(target['containers'])
        assert item['package'] in target['payloads']
        patch = ids[item['id']]
        decisions.append({'key': item['key'], 'status': 'mitigated', 'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
            'reason': f"Exact upstream OpenSSL fix {patch['commit']} for {item['id']} is present byte-for-byte in the native Debian source used to build {version}. Complete upstream suite: 4932 tests pass. Exported ABI, unchanged configuration/application scope, native task, crypto, TLS and two upstream regression checks passed before the scoped release. Current {item['package']} file hashes and symlinks match package {target['payloads'][item['package']]['archiveSha256']}; live image and release evidence rechecked. Per-CVE exploit reproduction is not claimed for all eight patches. Only this advisory and these bytes are covered; raw matches, other OpenSSL records, vendor FIPS modules and bundled libraries remain separate. Evidence: security-20261122/openssl-review.json. https://openssl-library.org/news/vulnerabilities-3.5/"})
    assert read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
    for decision in decisions:
        decision['reason'] = decision['reason'].replace('security-20261122/openssl-review.json', 'security-20261122/' + output.name)
    assert not output.exists()
    output.write_text(json.dumps({'date': now.isoformat(), 'scanDate': scan['completedAt'], 'applied': False,
        'decisions': decisions, 'proofs': proofs, 'productionChanged': False,
        'sourceBuildSha256': inputs['sourceBuildSha256'], 'releaseSha256': sha(RUNTIME / 'vendor-debian/release.json')}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'applied': False, 'productionChanged': False}))


if __name__ == '__main__':
    main()

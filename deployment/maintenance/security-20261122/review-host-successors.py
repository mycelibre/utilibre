"""Read-only exact vendor successor review; does not repair/restart the host.

The original four-package OpenSSL release still has a separate inventory-drift
failure. These three authenticated APT successors cannot waive that gate.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import re

HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/host-successors')
VERSIONS = {'qemu-utils': '1:11.1.3+ds-1~bpo13+1', 'qemu-guest-agent': '1:11.1.3+ds-1~bpo13+1',
            'sudo': '1.9.16p2-3+deb13u5'}
QEMU_IDS = frozenset('CVE-2026-12080 CVE-2026-16271 CVE-2026-17588 CVE-2026-66899 CVE-2026-66900 CVE-2026-77913 CVE-2026-81627 CVE-2026-84788 CVE-2026-93834 CVE-2026-101291 CVE-2026-111819 CVE-2026-18204 CVE-2026-18410 CVE-2026-18609 CVE-2026-7180 CVE-2026-97889'.split())
QEMU_COMPONENTS = {'CVE-2022-3872': 'SDHCI emulated device', 'CVE-2023-1386': '9p passthrough filesystem'}
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()


def eligible(item):
    return (item['status'] == 'needs-review' and item['scope'] == 'host-os'
            and item['artifact'] == 'host-dpkg' and item['type'] == 'debian'
            and not item['containers'] and item['package'] in VERSIONS
            and item['installed'] == VERSIONS[item['package']]
            and item['id'] in ({'CVE-2026-96512'} if item['package'] == 'sudo' else QEMU_IDS | QEMU_COMPONENTS.keys()))


def main():
    os.umask(0o077)
    assert not sys.argv[1:] or (len(sys.argv) == 3 and sys.argv[1] == '--checkpoint'
                              and re.fullmatch('[a-z][a-z0-9-]{0,39}', sys.argv[2]))
    report = 'review-' + sys.argv[2] + '.json' if sys.argv[1:] else 'review.json'
    pins = read(HERE / 'host-successor-review-inputs.json')
    for name, digest in pins['evidence'].items():
        assert sha(ROOT / name) == digest
    verified = read(ROOT / 'verified.json')
    acquired = read(ROOT / 'authenticated.json')
    assert verified['passed'] and verified['acquisitionSha256'] == sha(ROOT / 'authenticated.json')
    assert verified['qemuNativeSha256'] == sha(ROOT / 'native-check.json')
    assert read(ROOT / 'native-check.json')['passed']
    qemu_source = read(ROOT / 'qemu-successor-source.json')
    assert sha(ROOT / 'qemu-successor-source.json') == pins['qemuAdditional']['proofSha256']
    assert qemu_source['passed'] and qemu_source['productionChanged'] is False
    assert qemu_source['acquisitionSha256'] == sha(ROOT / 'authenticated.json')
    assert qemu_source['payloadProofSha256'] == sha(ROOT / 'verified.json')
    assert qemu_source['componentInputSha256'] == sha(HERE.parent / 'security-20261103/qemu-components.json')
    assert {p['id'] for p in qemu_source['patches']} == set(pins['qemuAdditional']['fixedAdvisories'])
    assert all(p['strictReverseCheckPassed'] for p in qemu_source['patches'])
    parity = read(ROOT / 'sudo-full-source-parity.json')
    assert parity['passed'] and parity['nativeProofSha256'] == sha(ROOT / 'verified.json')
    assert parity['sourceSha256'] == next(r['sourceSha256'] for r in verified['retainedRepairs'] if r.get('unprivilegedEnvironmentChecks'))
    confirmation = read(ROOT / 'operator-postcheck.json')
    assert confirmation['operatorConfirmed'] and confirmation['ping'] == 'passed' and confirmation['freezeStatus'] == 'thawed'
    assert confirmation['bootId'] == Path('/proc/sys/kernel/random/boot_id').read_text().strip()
    primary = read(ROOT.parents[1] / 'closure-followup-20261012/debian-primary.json')
    assert sha(ROOT.parents[1] / 'closure-followup-20261012/debian-primary.json') == pins['primarySha256']
    now = dt.datetime.now(dt.timezone.utc)
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(primary['date']) < dt.timedelta(days=1)
    for name, record in pins['primaryRecords'].items():
        source, advisory = name.split('/')
        assert primary['sources'][source][advisory] == record
        fixed = record['releases']['trixie' if source == 'sudo' else 'sid']
        assert fixed['status'] == 'resolved'
        # Exact official backports source is 11.1.3; removing the distro's
        # explicit backport suffix here does not infer arbitrary source parity.
        source_version = VERSIONS['sudo'] if source == 'sudo' else '1:11.1.3+ds-1'
        subprocess.run(['dpkg', '--compare-versions', source_version, 'ge', fixed['fixed_version']], check=True, timeout=10)
    for source in acquired['sources']:
        for file in source['files']:
            assert sha(ROOT / file['file']) == file['sha256']
    for package in acquired['packages']:
        name = package['name']
        assert package['version'] == VERSIONS[name] and sha(ROOT / package['file']) == package['sha256']
        assert subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', name], text=True, timeout=10) == VERSIONS[name]
        payload = next(p for p in verified['payloads'] if p['package'] == name)
        assert payload['archiveSha256'] == package['sha256'] and payload['version'] == VERSIONS[name]
        for filename, expected in payload['verifiedFiles'].items():
            path = Path('/') / filename
            if 'link' in expected:
                assert path.is_symlink() and os.readlink(path) == expected['link']
            else:
                assert not path.is_symlink() and sha(path) == expected['sha256']
    pid = subprocess.check_output(['systemctl', 'show', 'qemu-guest-agent.service', '-p', 'MainPID', '--value'], text=True, timeout=10).strip()
    assert int(pid) > 1 and sha('/proc/' + pid + '/exe') == sha('/usr/sbin/qemu-ga')
    scan, queue = [read(ROOT.parents[1] / f) for f in ('security.json', 'security-queue.json')]
    assert scan['status'] == 'checked' and scan['host']['status'] == 'checked'
    assert queue['status'] == 'current' and queue['scanDate'] == scan['completedAt']
    assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
    decisions = []
    for item in queue['items']:
        if not eligible(item):
            continue
        detail = ('Both timezone fixes are retained and the additional vendor environment-copy correction passes the ordinary-user source-function fixture; visudo configuration passed.'
                  if item['package'] == 'sudo' else
                  'Official 11.1.3 source retains the guest-key and websocket fixes; isolated block format, conversion and QMP checks passed. The live guest-agent executable matches the archive; the operator confirmed Proxmox ping and thawed.')
        reason = f"Exact official {item['package']} {item['installed']} successor: Debian primary evidence marks this advisory fixed in the authenticated source version. Current non-conffile package bytes and symlinks rechecked against signed-archive evidence. {detail} No new exploit reproduction, Proxmox hypervisor assessment or blanket host approval is claimed. The unrelated OpenSSL release inventory-drift gate remains separate. Evidence: security-20261122/host-successors/{{authenticated,verified,qemu-successor-source,review}}.json; https://security-tracker.debian.org/tracker/{item['id']}"
        if item['id'] in QEMU_COMPONENTS:
            reason = f"Exact {item['package']} {item['installed']} binary-subpackage attribution: {item['id']} affects the {QEMU_COMPONENTS[item['id']]}, absent from this package's complete executable set. Authenticated successor source plus ordered Debian packaging retains byte-identical reviewed Meson graphs and binary install lists; both components belong to system_ss, separate from guest-agent/block tools. Every installed package file and symlink matches the authenticated archive; native tools and guest-agent postcheck passed. Not a new patch, emulator exploit test, Proxmox assessment or whole-host clearance. Evidence: security-20261122/host-successors/{{authenticated,verified,qemu-successor-source}}.json; https://security-tracker.debian.org/tracker/{item['id']}"
        decisions.append({'key': item['key'], 'status': 'not-affected',
            'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
            'reason': reason})
    assert read(ROOT.parents[1] / 'security.json')['completedAt'] == scan['completedAt']
    out = ROOT / report
    assert not out.exists()
    out.write_text(json.dumps({'schemaVersion': 1, 'scanDate': scan['completedAt'], 'decisions': decisions,
        'inputSha256': sha(HERE / 'host-successor-review-inputs.json'), 'productionChanged': False,
        'network': 'none', 'wholeHostReleaseGatePassed': False}, indent=2) + '\n')
    print(json.dumps({'prepared': len(decisions), 'applied': False}))


if __name__ == '__main__':
    main()

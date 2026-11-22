"""Read-only vendor-payload reassessment; no boot writes or installation.

The existing release and real-boot receipts establish the prior installation.
This checks current package and EFI bytes plus a pinned primary advisory snapshot.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OLD = ROOT.parent / 'security-20261109/remaining-high'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
ids = set('CVE-2025-54770 CVE-2025-54771 CVE-2025-61661 CVE-2025-61662 CVE-2025-61663 CVE-2025-61664 CVE-2026-97876'.split())
packages = {'grub-efi-amd64-bin', 'grub-efi-amd64-unsigned', 'grub-pc-bin', 'grub2-common'}
version = '2.14-5'
pin_path = HERE.parent / 'grub-assessment/vendor-candidate.json'
pin = read(pin_path)
release = read(OLD / 'vendor-release-20261110/release.json')
boot = read(OLD / 'vendor-release-20261110/post-reboot.json')
assert release['manifestSha256'] == sha(pin_path)
assert release['status'] == 'installed-verified-awaiting-reboot'
assert boot['passed'] and boot['realVmBootVerified'] and boot['grubVersion'] == version
assert boot['signedEfiSha256'] == pin['signedEfiSha256']
for name in ['/boot/efi/EFI/BOOT/grubx64.efi', '/boot/efi/EFI/debian/grubx64.efi',
             '/usr/lib/grub/x86_64-efi-signed/grubx64.efi.signed']:
    assert sha(name) == pin['signedEfiSha256'], 'Current EFI payload differs'
primary = ROOT / 'primary/debian-security-tracker.json'
assert sha(primary) == '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
tracker = read(primary)['grub2']
for identifier in ids:
    record = tracker[identifier]['releases']['sid']
    assert record['status'] == 'resolved' and record['fixed_version'] in ('2.14-1', '2.14-4')
now = dt.datetime.now(dt.timezone.utc)
scan, queue = [read(ROOT.parent / f) for f in ('security.json', 'security-queue.json')]
assert scan['status'] == 'checked' and scan['host']['status'] == 'checked'
assert queue['status'] == 'current' and queue['scanDate'] == scan['completedAt']
assert dt.timedelta(0) <= now - dt.datetime.fromisoformat(scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
proofs = []
for package in sorted(packages):
    p = next(p for p in pin['packages'] if p['name'] == package)
    assert p['version'] == version
    deb = OLD / 'vendor-inputs' / Path(p['path']).name
    assert sha(deb) == p['sha256']
    assert subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', package], text=True, timeout=10) == version
    files, links, documentation_aliases = {}, {}, {}
    with tempfile.TemporaryDirectory(prefix='grub-proof-', dir=ROOT) as temp:
        subprocess.run(['dpkg-deb', '-x', str(deb), temp], check=True, timeout=30)
        for base, dirs, names in os.walk(temp):
            for name in dirs + names:
                f = Path(base) / name
                path = Path('/') / f.relative_to(temp)
                if f.is_symlink():
                    assert path.is_symlink(), str(path)
                    expected, actual = os.readlink(f), os.readlink(path)
                    if actual != expected:
                        # Debian's transitional documentation link was retained
                        # by dpkg. Both spellings must resolve to the exact same
                        # documentation directory; executable links stay exact.
                        assert str(path) in ('/usr/share/doc/grub-efi-amd64-unsigned', '/usr/share/doc/grub-pc-bin')
                        assert (actual, expected) == ('grub-common', 'grub2-common')
                        assert path.resolve() == (path.parent / expected).resolve() == Path('/usr/share/doc/grub-common')
                        documentation_aliases[str(path)] = {'packaged': expected, 'installed': actual, 'sameResolvedDirectory': True}
                    links[str(path)] = actual
                elif f.is_file():
                    assert not path.is_symlink() and path.is_file() and sha(path) == sha(f), str(path)
                    files[str(path)] = sha(f)
    assert files
    proofs.append({'package': package, 'version': version, 'archiveSha256': p['sha256'], 'files': files, 'links': links, 'documentationAliases': documentation_aliases})
proof_hash = hashlib.sha256(json.dumps(proofs, sort_keys=True).encode()).hexdigest()
decisions = []
for item in queue['items']:
    if (item['status'] != 'needs-review' or item['scope'] != 'host-os' or item['artifact'] != 'host-dpkg'
            or item['type'] != 'debian' or item['package'] not in packages or item['installed'] != version or item['id'] not in ids):
        continue
    decisions.append({'key': item['key'], 'status': 'not-affected', 'expiresAt': (now + dt.timedelta(days=7)).isoformat(),
                      'reason': f"Installed Debian GRUB {version} package file hashes and runtime links match authenticated vendor archives; two retained documentation aliases resolve to the identical directory and are recorded separately. Current signed EFI bytes match the recorded, real-boot-verified release. Debian's pinned November 22 grub2 tracker marks {item['id']} fixed by {tracker[item['id']]['releases']['sid']['fixed_version']}. Payload proof {proof_hash}. Raw matches retained. No boot writes, new reboot, exploit reproduction or whole-VM restore claimed. Evidence: security-20261122/grub-review.json; https://security-tracker.debian.org/tracker/{item['id']}"})
assert read(ROOT.parent / 'security.json')['completedAt'] == scan['completedAt']
out = ROOT / 'grub-review.json'
assert not out.exists()
out.write_text(json.dumps({'date': now.isoformat(), 'scanDate': scan['completedAt'], 'applied': False,
                          'decisions': decisions, 'proofs': proofs, 'primarySha256': sha(primary),
                          'releaseSha256': sha(OLD / 'vendor-release-20261110/release.json'),
                          'realBootReceiptSha256': sha(OLD / 'vendor-release-20261110/post-reboot.json'),
                          'productionChanged': False}, indent=2) + '\n')
print(json.dumps({'prepared': len(decisions), 'productionChanged': False, 'applied': False}))

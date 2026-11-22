"""Verify the four installed crypto packages without rewriting release history.

The strict whole-host release gate correctly detected a separate APT upgrade.
This component receipt proves only the declared crypto payload and activation;
it does not approve those additional changes or reuse the closed host window.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
from assessment_helpers import installed_packages

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'host-openssl'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
run = lambda args: subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=30).strip()
target = OUT / 'activated-component.json'
assert not target.exists(), 'Preserve the completed component verification'
release = read(OUT / 'release.json')
prepared = read(OUT / 'prepared.json')
assert release['status'] == 'installed-awaiting-restart'
assert sha(OUT / 'prepared.json') == release['preparedSha256']
assert sha(OUT / 'scan-gate.json') == release['scanSha256']
assert sha(HERE / 'release-host-openssl.mjs') == release['recipeSha256']
assert prepared['passed'] and prepared['sourceNativeTests'] == 4932
assert sha(ROOT / 'openssl-build-v2/built.json') == prepared['sourceBuildSha256']
assert prepared['newVersion'] == release['newVersion'] == '3.5.9-1~deb13u1+utilibre1'
names = {'libssl3t64', 'openssl-provider-legacy', 'openssl', 'libssl-dev'}
archives = [r for r in prepared['records'] if r['phase'] == 'after']
assert {r['package'] for r in archives} == names
for row in archives:
    assert sha(row['archive']) == row['sha256']
    assert run(['dpkg-query', '-W', '-f=${Version}', row['package']]) == prepared['newVersion']
for row in release['payloads']['after']:
    file = Path(row['file'])
    if row['file'].startswith('/etc/'):
        continue
    st = file.lstat()
    assert (st.st_mode & 0o7777, st.st_uid, st.st_gid) == (row['mode'], row['uid'], row['gid'])
    if 'link' in row:
        assert file.is_symlink() and os.readlink(file) == row['link']
    else:
        assert file.is_file() and not file.is_symlink() and sha(file) == row['sha256']
assert sha('/etc/ssl/openssl.cnf') == prepared['hostConfigurationSha256'] == release['configSha256']
assert not run(['dpkg', '--audit'])
run(['/usr/sbin/sshd', '-t'])
assert 'OpenSSL 3.5.9' in run(['/usr/bin/openssl', 'version'])
boot_changed = Path('/proc/sys/kernel/random/boot_id').read_text().strip() != release['bootId']
assert boot_changed
own = Path('/').stat()
stale = 0
for proc in Path('/proc').iterdir():
    if not proc.name.isdigit():
        continue
    try:
        root = (proc / 'root').stat()
        if (own.st_dev, own.st_ino) != (root.st_dev, root.st_ino):
            continue
        if any(('libcrypto.so.3' in line or 'libssl.so.3' in line) and line.endswith('(deleted)')
               for line in (proc / 'maps').read_text().splitlines()):
            stale += 1
    except (FileNotFoundError, ProcessLookupError):
        pass
assert stale == 0
before = installed_packages((OUT / 'scan-before/var/lib/dpkg/status').read_bytes())
now = installed_packages(Path('/var/lib/dpkg/status').read_bytes())
drift = [{'package': p, 'before': before.get(p), 'after': now.get(p)}
         for p in sorted(before.keys() | now.keys()) if before.get(p) != now.get(p)]
assert drift == read(OUT / 'post-boot-package-drift.json'), 'New inventory drift needs separate review'
other = [r for r in drift if r['package'] not in names]
assert len(other) == 21
proof = {'schemaVersion': 1, 'date': dt.datetime.now(dt.timezone.utc).isoformat(),
    'passed': True, 'scope': 'Four installed OpenSSL packages and active host consumers only',
    'releaseSha256': sha(OUT / 'release.json'), 'preparedSha256': sha(OUT / 'prepared.json'),
    'sourceBuildSha256': prepared['sourceBuildSha256'], 'version': prepared['newVersion'],
    'packages': sorted(names), 'payloads': release['payloads']['after'],
    'configurationSha256': release['configSha256'], 'restartObserved': True,
    'oldHostCryptoConsumers': 0, 'dpkgAuditPassed': True, 'sshConfigurationPassed': True,
    'independentPackageChanges': other, 'driftEvidenceSha256': sha(OUT / 'post-boot-package-drift.json'),
    'wholeHostReleaseGatePassed': False, 'productionChanged': False,
    'limitation': 'Additional APT changes remain a separate assessment. This does not rewrite the strict original release receipt, clear other libraries, or authorize another restart.'}
target.write_text(json.dumps(proof, indent=2) + '\n')
print('Four-package crypto activation verified; original whole-host drift gate preserved.')

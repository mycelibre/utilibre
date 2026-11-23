"""Review only Kerberos source-package matches without the affected component.

Debian packages the KDC dump tool, LDAP KDB plugin and GSS RPC library
separately. This reviewer checks their current installed package inventories
and files. It does not suppress a match in a role that has the component.
"""

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261122/krb5-components'
TRACKER = ROOT / 'security-20261122/primary/debian-security-tracker.json'
TRACKER_SHA256 = '56ab97cc2791c8dd0476b7d3d060a7a76c9bb9f13a8185131507a6889373759c'
COMPONENTS = {
    'CVE-2018-5709': {'packages': ('krb5-kdc',),
                      'files': ('usr/sbin/kdb5_util', 'sbin/kdb5_util'),
                      'text': 'kadmin/dbutil/dump.c',
                      'source': 'https://packages.debian.org/trixie/amd64/krb5-kdc/filelist'},
    'CVE-2026-11850': {'packages': ('krb5-kdc-ldap',),
                       'files': ('usr/lib/x86_64-linux-gnu/krb5/libkdb_ldap.so.1',),
                       'text': 'plugins/kdb/ldap/libkdb_ldap/ldap_principal2.c',
                       'source': 'https://packages.debian.org/trixie/krb5-kdc-ldap'},
    'CVE-2024-26458': {'packages': ('libgssrpc4', 'libgssrpc4t64'),
                       'files': ('usr/lib/x86_64-linux-gnu/libgssrpc.so.4',),
                       'text': 'lib/rpc/pmap_rmt.c',
                       'source': 'https://packages.debian.org/trixie/libgssrpc4t64'},
}


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def installed(root):
    status = root / 'var/lib/dpkg/status'
    assert status.is_file()
    names = set()
    for block in status.read_text().split('\n\n'):
        fields = {line.split(': ', 1)[0]: line.split(': ', 1)[1]
                  for line in block.splitlines() if ': ' in line}
        if fields.get('Status') == 'install ok installed':
            names.add(fields['Package'])
    assert 'libc6' in names and 'libkrb5-3' in names
    return names


scan = read(ROOT / 'security.json')
queue = read(ROOT / 'security-queue.json')
assert scan['status'] == 'checked' and queue['status'] == 'current'
assert scan['completedAt'] == queue['scanDate'] and scan['host']['status'] == 'checked'
assert dt.timedelta(0) <= dt.datetime.now(dt.timezone.utc) - dt.datetime.fromisoformat(
    scan['completedAt'].replace('Z', '+00:00')) < dt.timedelta(days=1)
assert sha(TRACKER) == TRACKER_SHA256 and not OUT.exists()
tracker = read(TRACKER)['krb5']
for advisory, component in COMPONENTS.items():
    assert component['text'] in tracker[advisory]['description']

images = {row['id']: row for row in scan['images']}
rows = [row for row in queue['items'] if row['id'] in COMPONENTS
        and row['status'] == 'needs-review' and row['severity'] == 'LOW'
        and row['type'] == 'debian' and row['scope'] in ('runtime-image', 'host-os')]
assert {advisory: len([row for row in rows if row['id'] == advisory])
        for advisory in COMPONENTS} == {'CVE-2018-5709': 75, 'CVE-2026-11850': 75,
                                        'CVE-2024-26458': 75}
checks = []
eligible = set()
targets = {('host-os', 'host-dpkg')} | {('runtime-image', row['artifact'])
                                     for row in rows if row['scope'] == 'runtime-image'}
for scope, artifact in sorted(targets):
    if scope == 'host-os':
        roots = [('host-dpkg', Path('/'))]
    else:
        image = images[artifact]
        assert image['status'] == 'checked' and image['containers']
        roots = []
        for role in sorted(image['containers']):
            info = json.loads(subprocess.check_output(['docker', 'inspect', role],
                                                      text=True, timeout=20))[0]
            assert info['Image'] == artifact and info['State']['Running']
            roots.append((role, Path('/proc') / str(info['State']['Pid']) / 'root'))
    for advisory, component in COMPONENTS.items():
        clear = True
        for role, root in roots:
            names = installed(root)
            package_present = bool(set(component['packages']) & names)
            file_present = any((root / path).exists() for path in component['files'])
            clear &= not package_present and not file_present
            checks.append({'scope': scope, 'artifact': artifact, 'role': role,
                           'advisory': advisory, 'componentPackagePresent': package_present,
                           'componentFilePresent': file_present})
        if clear:
            eligible.add((scope, artifact, advisory))

selected = [row for row in rows if (row['scope'], row['artifact'], row['id']) in eligible]
counts = {advisory: len([row for row in selected if row['id'] == advisory])
          for advisory in COMPONENTS}
assert counts == {'CVE-2018-5709': 75, 'CVE-2026-11850': 75,
                  'CVE-2024-26458': 69}
assert any(row['componentPackagePresent'] and row['advisory'] == 'CVE-2024-26458'
           for row in checks), 'The image with libgssrpc must remain open'
assert len({row['key'] for row in selected}) == len(selected) == 219

OUT.mkdir(mode=0o700)
proof = {'date': dt.datetime.now(dt.timezone.utc).isoformat(), 'scanDate': scan['completedAt'],
         'primarySha256': sha(TRACKER), 'counts': counts, 'checks': checks,
         'productionChanged': False}
(OUT / 'runtime.json').write_text(json.dumps(proof, indent=2) + '\n')
expiry = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=7)).isoformat()
proof_ref = f'security-20261122/krb5-components/runtime.json SHA256 {sha(OUT / "runtime.json")}'
reasons = {}
for advisory, component in COMPONENTS.items():
    reasons[advisory] = (f'{advisory} is in a separately packaged Kerberos component. '
                         'The exact current host/image and every running role lack both its installed package and affected component file. '
                         f'Proof {proof_ref}. Recheck on image/package changes or in seven days. '
                         f'{component["source"]} '
                         f'https://security-tracker.debian.org/tracker/{advisory}')
batch = {'schemaVersion': 1, 'scanDate': scan['completedAt'],
         'decisions': [{'key': row['key'], 'status': 'not-affected',
                        'reason': reasons[row['id']], 'expiresAt': expiry}
                       for row in sorted(selected, key=lambda row: row['key'])],
         'runtimeProofSha256': sha(OUT / 'runtime.json'), 'productionChanged': False}
(OUT / 'review.json').write_text(json.dumps(batch, indent=2) + '\n')
print(json.dumps({'prepared': len(selected), 'counts': counts,
                  'componentPresentRolesLeftOpen': True, 'productionChanged': False}))

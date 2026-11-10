"""Explicit eight-package vendor release after a separately confirmed console window.

Not an unattended updater. Reuses the pinned assessment, native dpkg/hooks and
private evidence. Does not reboot, refresh packages, notify or accept findings.
Failure stops for console-assisted assessment; there is no automatic rollback.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
BASE = Path('/var/lib/utilibre-maintenance/security-20261109/remaining-high')


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def read(path):
    return json.loads(path.read_text())


def output(args):
    return subprocess.check_output(args, text=True, timeout=30).strip()


def packages():
    rows = output(['dpkg-query', '-W', '-f=${binary:Package}\t${Version}\n'])
    return dict(line.split('\t', 1) for line in rows.splitlines())


def service_pids():
    result = {}
    for name in ('docker', 'ssh', 'qemu-guest-agent'):
        assert output(['systemctl', 'is-active', name]) == 'active', name
        result[name] = output(['systemctl', 'show', '-p', 'MainPID', '--value', name])
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    if not __debug__:
        parser.error('Input assertions require normal Python execution without -O.')
    parser.add_argument('--evidence', type=Path, required=True)
    parser.add_argument('--apply', action='store_true', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    work = args.evidence.resolve()
    assert work.is_relative_to(BASE) and work.is_dir()
    assert work.stat().st_mode & 0o077 == 0
    assert not (work / 'release.json').exists(), 'Retain the previous release receipt'
    pin = read(HERE / 'vendor-candidate.json')
    approval = read(work / 'approval.json')
    now = datetime.now(timezone.utc)
    assert approval['vmid'] == 144 and approval['automaticReboot'] is False
    assert approval['consoleAvailable'] and approval['backupsAndSnapshotsPaused']
    assert datetime.fromisoformat(approval['confirmedAt']) <= now < datetime.fromisoformat(approval['expiresAt'])
    assert approval['manifestSha256'] == sha(HERE / 'vendor-candidate.json')
    assert approval['packages'] == [{'name': p['name'], 'version': p['version']} for p in pin['packages']]
    preflight = read(work / 'preflight.json')
    assert preflight['passed'] and preflight['manifestSha256'] == approval['manifestSha256']
    assert (now - datetime.fromisoformat(preflight['date'])).total_seconds() < 900
    assert read(BASE / 'vendor-boot/replay-next-kernel-repeat.json')['passed']
    assessment = read(work / 'candidate-assessment.json')
    assert assessment['passed'] and not assessment['newHighCritical']
    assert sha(work / 'scanner-cache/db/trivy.db') == assessment['databaseSha256']
    assert (now - datetime.fromisoformat(assessment['databaseUpdatedAt'].replace('Z', '+00:00'))).total_seconds() < 48 * 3600
    assert shutil.disk_usage('/').free > 8 * 1024**3
    assert output(['findmnt', '-n', '-o', 'FSTYPE', '--target', '/boot/efi']) == 'vfat'
    assert not output(['dpkg', '--audit'])
    for name, version in pin['installedPreconditions'].items():
        assert output(['dpkg-query', '-W', '-f=${Version}', name]) == version, name
    before = packages()
    pids = service_pids()
    boot_vars = {str(p): sha(p) for p in Path('/sys/firmware/efi/efivars').glob('Boot*')}
    backup = read(BASE / 'vendor-recovery/boot-files-before.json')
    assert sha(BASE / 'vendor-recovery/boot-files-before.tar.gz') == backup['sha256']
    for name, expected in backup['regularFiles'].items():
        assert sha(Path('/') / name) == expected, name
    recovery = read(BASE / 'vendor-recovery/authentication.json')
    old = {p['name']: p for p in recovery['packages']}
    files = []
    for p in pin['packages']:
        file = BASE / 'vendor-inputs' / Path(p['path']).name
        assert file.stat().st_size == p['bytes'] and sha(file) == p['sha256']
        rollback = old[p['name']]
        assert rollback['version'] == pin['installedPreconditions'][p['name']]
        assert sha(BASE / 'vendor-recovery' / rollback['file']) == rollback['sha256']
        files.append(str(file))
    report = {'startedAt': now.isoformat(), 'status': 'applying',
              'coordinatorSha256': sha(__file__), 'manifestSha256': approval['manifestSha256'],
              'approvalSha256': sha(work / 'approval.json'), 'rebooted': False,
              'realBootVerified': False, 'findingsClosed': 0}

    def save():
        (work / 'release.json').write_text(json.dumps(report, indent=2) + '\n')

    save()
    env = {**os.environ, 'DEBIAN_FRONTEND': 'noninteractive', 'NEEDRESTART_MODE': 'l'}
    try:
        with (work / 'installation.log').open('x') as log:
            subprocess.run(['dpkg', '--force-confdef', '--force-confold', '--install', *files],
                           env=env, stdout=log, stderr=subprocess.STDOUT, check=True, timeout=240)
            subprocess.run(['update-grub'], env=env, stdout=log, stderr=subprocess.STDOUT,
                           check=True, timeout=120)
            subprocess.run(['grub-script-check', '/boot/grub/grub.cfg'], stdout=log,
                           stderr=subprocess.STDOUT, check=True, timeout=30)
        assert not output(['dpkg', '--audit'])
        after = packages()
        changes = {name.split(':', 1)[0] for name in set(before) | set(after) if before.get(name) != after.get(name)}
        assert changes == {p['name'] for p in pin['packages']}, changes
        for p in pin['packages']:
            assert output(['dpkg-query', '-W', '-f=${Version}', p['name']]) == p['version']
        for file in ['/boot/efi/EFI/BOOT/grubx64.efi', '/boot/efi/EFI/debian/grubx64.efi',
                     '/usr/lib/grub/x86_64-efi-signed/grubx64.efi.signed']:
            assert sha(file) == pin['signedEfiSha256'], file
        module = read(BASE / 'grub-candidate-scan-2/vendor-primary-review.json')['moduleSha256']
        for file in ['/usr/lib/grub/x86_64-efi/gettext.mod', '/boot/grub/x86_64-efi/gettext.mod']:
            assert sha(file) == module, file
        for file in ['/boot/efi/EFI/BOOT/BOOTX64.EFI', '/boot/efi/EFI/debian/shimx64.efi']:
            assert sha(file) == backup['regularFiles'][file.lstrip('/')], file
        assert boot_vars == {str(p): sha(p) for p in Path('/sys/firmware/efi/efivars').glob('Boot*')}
        assert service_pids() == pids
        report.update(status='installed-verified-awaiting-reboot', packageChanges=sorted(changes),
                      signedEfiSha256=pin['signedEfiSha256'], moduleSha256=module,
                      bootVariablesUnchanged=True, shimUnchanged=True, servicePidsUnchanged=True)
    except Exception as error:
        report.update(status='failed-needs-operator-review', error=str(error)[-2000:])
        raise
    finally:
        report['completedAt'] = datetime.now(timezone.utc).isoformat()
        save()
    print(json.dumps(report))


if __name__ == '__main__':
    main()

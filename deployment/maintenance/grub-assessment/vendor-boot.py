"""Replay ordinary boot checks of pinned vendor images, with no network/downloads.

Inputs are private, checksummed bundles made from the authenticated Debian
packages, current kernel and synthetic fixtures listed in vendor-boot.json.
No host device, production mount, firmware variable or Docker socket is passed
to the container. Passing does not authorize deployment or prove a VM restore.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile

HERE = Path(__file__).resolve().parent


def sha(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    if not __debug__:
        parser.error('Run without Python optimization; input assertions are required.')
    parser.add_argument('--inputs', required=True, type=Path)
    parser.add_argument('--report', required=True, type=Path)
    args = parser.parse_args()
    os.umask(0o077)
    assert args.inputs.is_absolute() and args.inputs.is_dir()
    assert args.report.is_absolute() and not args.report.exists()
    assert not args.report.resolve().is_relative_to(HERE.parents[2])
    pin = json.loads((HERE / 'vendor-boot.json').read_text())
    assert pin['schemaVersion'] == 1 and pin['deploymentAllowed'] is False
    report = {'date': datetime.now(timezone.utc).isoformat(), 'passed': False,
              'manifestSha256': sha(HERE / 'vendor-boot.json'),
              'coordinatorSha256': sha(__file__), 'network': 'none',
              'productionChanged': False, 'wholeVmRestoreTested': False,
              'realProxmoxFirmwareTested': False, 'rows': []}
    logs = args.report.with_suffix('.logs')
    logs.mkdir(mode=0o700)
    try:
        for name, expected in pin['sourceFixtures'].items():
            assert sha(HERE / name) == expected, name
        for key, value in pin['archives'].items():
            file = args.inputs / value['file']
            assert file.stat().st_size == value['bytes'] and sha(file) == value['sha256'], key
        assert shutil.disk_usage('/run').free > 512 * 1024**2
        with tempfile.TemporaryDirectory(prefix='utilibre-vendor-boot-', dir='/run') as folder:
            work = Path(folder)
            for key, value in pin['archives'].items():
                destination = work / key
                destination.mkdir()
                with tarfile.open(args.inputs / value['file']) as archive:
                    members = archive.getmembers()
                    assert sum(m.size for m in members) < 512 * 1024**2
                    assert len(members) < 20000
                    archive.extractall(destination, filter='data')
                # /run's private outer directory stays 0700. Only the public
                # vendor/synthetic mount roots must be readable by uid 65534.
                for p in destination.rglob('*'):
                    if p.is_dir() and not p.is_symlink():
                        p.chmod(0o755)
            for case in ['candidate', 'recovered']:
                fat = work / case / 'fat'
                assert sha(fat / 'vmlinuz') == pin['kernelSha256']
                assert sha(fat / 'initramfs.gz') == pin['initramfsSha256']
                assert sha(fat / 'EFI/BOOT/BOOTX64.EFI') == pin['shimSha256']
                assert sha(fat / 'EFI/BOOT/grubx64.efi') == pin[case + 'EfiSha256']
                for p in ['EFI/BOOT/grub.cfg', 'EFI/debian/grub.cfg', 'boot/grub/grub.cfg']:
                    assert sha(fat / p) == pin['sourceFixtures']['vendor-grub.cfg']
                name = f'utilibre-vendor-boot-{os.getpid()}-{case}'
                command = ['docker', 'run', '--rm', '-i', '--pull', 'never', '--name', name,
                           '--network', 'none', '--read-only', '--user', '65534:65534',
                           '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                           '--memory', '768m', '--cpus', '1', '--pids-limit', '128',
                           '--tmpfs', '/work:rw,nosuid,nodev,exec,size=384m',
                           '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=8m',
                           '--mount', f'type=bind,src={work / "tools/tools"},dst=/inputs/tools,readonly',
                           '--mount', f'type=bind,src={fat},dst=/inputs/fat,readonly',
                           '--entrypoint', '/bin/sh', pin['testImage'], '-s']
                log = logs / (case + '.log')
                try:
                    with log.open('x') as stream:
                        result = subprocess.run(command, input=(HERE / 'check-vendor-boot.sh').read_text(),
                                                text=True, stdout=stream, stderr=subprocess.STDOUT, timeout=90)
                    assert log.stat().st_size < 1024**2
                    text = log.read_text()
                    assert result.returncode == 0
                    assert 'UTILIBRE_VENDOR_GRUB_BOOT_OK' in text
                    assert 'UTILIBRE_VENDOR_KERNEL_BOOT_OK' in text
                    report['rows'].append({'case': case, 'passed': True, 'logSha256': sha(log)})
                finally:
                    subprocess.run(['docker', 'rm', '-f', name], capture_output=True, timeout=15)
            report['passed'] = len(report['rows']) == 2
    except Exception as error:
        report['error'] = str(error)[-2000:]
        raise
    finally:
        with args.report.open('x') as stream:
            json.dump(report, stream, indent=2)
            stream.write('\n')
    print(json.dumps({'passed': report['passed'], 'bootCases': len(report['rows']),
                      'productionChanged': False, 'wholeVmRestoreTested': False}))


if __name__ == '__main__':
    main()

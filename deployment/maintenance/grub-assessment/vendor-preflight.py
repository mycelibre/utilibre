"""Replay the pinned vendor candidate's preflight, without installation/downloads.

Uses archived Debian signature/index/package checks and existing Docker tooling.
No boot device, firmware variable, service, decision ledger or APT source changes.
Successful preflight is neither boot verification nor deployment authorization.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import lzma
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

HERE = Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(args, timeout=30, text=None):
    result = subprocess.run(args, input=text, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f'{args[0]} exited {result.returncode}: {result.stderr[-2000:]}')
    return result.stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    os.umask(0o077)
    assert args.inputs.is_absolute() and args.inputs.is_dir()
    assert args.report.is_absolute() and not args.report.exists()
    assert not args.report.resolve().is_relative_to(HERE.parents[2]), 'Keep host evidence outside the repository'
    pin = json.loads((HERE / 'vendor-candidate.json').read_text())
    assert pin['schemaVersion'] == 1 and pin['approval'] == 'assessment-only'
    assert pin['deploymentAllowed'] is False
    report = {'date': datetime.now(timezone.utc).isoformat(), 'passed': False,
              'manifestSha256': sha(HERE / 'vendor-candidate.json'),
              'coordinatorSha256': sha(__file__),
              'network': 'none', 'installed': False, 'bootTested': False,
              'releaseApproved': False, 'findingsClosed': 0}
    boot_paths = ['/boot/grub/grub.cfg', '/boot/efi/EFI/BOOT/BOOTX64.EFI',
                  '/boot/efi/EFI/BOOT/grubx64.efi', '/boot/efi/EFI/debian/grubx64.efi']
    before = {p: sha(p) for p in boot_paths}
    status_before = sha('/var/lib/dpkg/status')
    try:
        report['toolVersions'] = {
            tool: run([tool, '--version']).splitlines()[0]
            for tool in ['python3', 'apt-get', 'sqv', 'docker']}
        for filename, key in [('InRelease', 'releaseSha256'),
                              ('Packages.xz', 'packagesIndexSha256'),
                              ('debian-archive-keyring.pgp', 'keyringSha256')]:
            assert sha(args.inputs / filename) == pin[key], f'Unexpected {filename}'
        assert sha(HERE / 'check-vendor.sh') == pin['testFixtureSha256']
        for package, version in pin['installedPreconditions'].items():
            assert run(['dpkg-query', '-W', '-f=${Version}', package]) == version, package
        lib = pin['runtimeLibrary']
        assert sha(lib['path']) == lib['sha256'], 'Runtime dependency changed'
        assert run(['docker', 'image', 'inspect', '--format', '{{.Id}}', pin['testImage']]).strip() == pin['testImage']
        assert shutil.disk_usage('/run').free >= 256 * 1024**2, 'Need 256 MiB staging space in /run'
        with tempfile.TemporaryDirectory(prefix='utilibre-grub-preflight-', dir='/run') as directory:
            work = Path(directory)
            run(['sqv', '--keyring', str(args.inputs / 'debian-archive-keyring.pgp'),
                 '--cleartext', '--output', str(work / 'release'), str(args.inputs / 'InRelease')])
            signed = (work / 'release').read_text().split('\nSHA256:\n')[1]
            entry = next(line.split() for line in signed.splitlines()
                         if line.endswith(' main/binary-amd64/Packages.xz'))
            blob = (args.inputs / 'Packages.xz').read_bytes()
            assert entry[:2] == [hashlib.sha256(blob).hexdigest(), str(len(blob))]
            decoder = lzma.LZMADecompressor()
            index = decoder.decompress(blob, max_length=160 * 1024**2)
            assert decoder.eof, 'Oversized package index'
            wanted = {p['name']: p for p in pin['packages']}
            authenticated = set()
            for block in index.decode().split('\n\n'):
                fields = dict(line.split(': ', 1) for line in block.splitlines()
                              if ': ' in line and not line[0].isspace())
                name = fields.get('Package')
                if name not in wanted:
                    continue
                p = wanted[name]
                assert [fields[k] for k in ['Version', 'Filename', 'SHA256', 'Size']] == [
                    p['version'], p['path'], p['sha256'], str(p['bytes'])], name
                authenticated.add(name)
            assert authenticated == set(wanted)
            packages = []
            extracted = work / 'extracted'
            extracted.mkdir(mode=0o755)
            extracted.chmod(0o755)
            for p in pin['packages']:
                file = args.inputs / Path(p['path']).name
                assert file.stat().st_size == p['bytes'] and sha(file) == p['sha256'], p['name']
                run(['dpkg-deb', '--extract', str(file), str(extracted / p['name'])])
                (extracted / p['name']).chmod(0o755)
                packages.append(str(file))
            image = extracted / 'grub-efi-amd64-signed/usr/lib/grub/x86_64-efi-signed/grubx64.efi.signed'
            assert sha(image) == pin['signedEfiSha256']
            apt = work / 'apt'
            for folder in ['etc/parts', 'etc/sources', 'lists/partial', 'cache/archives/partial', 'log']:
                (apt / folder).mkdir(parents=True)
            for file in ['etc/apt.conf', 'etc/sources.list']:
                (apt / file).write_text('')
            shutil.copyfile('/var/lib/dpkg/status', apt / 'status')
            options = {'Dir::Etc::main': 'etc/apt.conf', 'Dir::Etc::parts': 'etc/parts',
                       'Dir::Etc::sourcelist': 'etc/sources.list', 'Dir::Etc::sourceparts': 'etc/sources',
                       'Dir::State::status': 'status', 'Dir::State::lists': 'lists',
                       'Dir::Cache': 'cache', 'Dir::Log': 'log'}
            command = ['apt-get', '--simulate', '--no-download', '--no-remove', '--no-install-recommends',
                       '-o', 'Debug::NoLocking=1']
            for key, value in options.items():
                command += ['-o', key + '=' + str(apt / value)]
            simulation = run(command + ['install'] + packages)
            installs = re.findall(r'^Inst (\S+)', simulation, re.M)
            assert len(installs) == len(wanted) and set(installs) == set(wanted)
            assert not re.search(r'^Remv ', simulation, re.M)
            report['aptSimulation'] = simulation
            library_dir = extracted / 'runtime-libraries'
            library_dir.mkdir(mode=0o755)
            library_dir.chmod(0o755)
            shutil.copyfile(lib['path'], library_dir / Path(lib['path']).name)
            (library_dir / Path(lib['path']).name).chmod(0o644)
            config = work / 'boot-config.cfg'
            shutil.copyfile('/boot/grub/grub.cfg', config)
            config.chmod(0o644)
            name = 'utilibre-grub-preflight-' + str(os.getpid())
            command = ['docker', 'run', '--rm', '-i', '--pull', 'never', '--name', name,
                       '--network', 'none', '--read-only', '--user', '65534:65534',
                       '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
                       '--memory', '256m', '--cpus', '1', '--pids-limit', '64',
                       '--tmpfs', '/work:rw,nosuid,nodev,exec,size=64m',
                       '--tmpfs', '/tmp:rw,nosuid,nodev,noexec,size=4m',
                       '--mount', f'type=bind,src={extracted},dst=/candidate/extracted,readonly',
                       '--mount', f'type=bind,src={config},dst=/candidate/boot-config.cfg,readonly',
                       '--entrypoint', '/bin/sh', pin['testImage'], '-s']
            try:
                output = run(command, timeout=60, text=(HERE / 'check-vendor.sh').read_text())
            finally:
                subprocess.run(['docker', 'rm', '-f', name], capture_output=True, timeout=15)
            assert '(GRUB) 2.14-5' in output and 'PASS: version, current-config,' in output
            report.update({'passed': True, 'packageCount': len(packages), 'ordinaryChecks': 6,
                           'nativeOutput': output, 'bootConfigSha256': sha(config),
                           'signedEfiSha256': sha(image), 'remainingGates': pin['remainingGates']})
    except Exception as error:
        report['error'] = str(error)[-2000:]
        raise
    finally:
        report['bootFilesUnchanged'] = before == {p: sha(p) for p in boot_paths}
        report['packageDatabaseUnchanged'] = status_before == sha('/var/lib/dpkg/status')
        if not report['bootFilesUnchanged'] or not report['packageDatabaseUnchanged']:
            report['passed'] = False
        with args.report.open('x') as file:
            json.dump(report, file, indent=2)
            file.write('\n')
    assert report['passed'], 'Host prerequisites changed during assessment'
    print(json.dumps({k: report[k] for k in ['passed', 'packageCount', 'ordinaryChecks',
                                          'bootTested', 'installed', 'findingsClosed']}))


if __name__ == '__main__':
    main()

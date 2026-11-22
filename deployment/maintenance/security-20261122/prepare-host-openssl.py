"""Prepare four exact host packages without installation or service changes.

Reuses the completed source build and native fixtures. Tests run without a
network, as nobody, with a clean environment and temporary synthetic files.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
OUT = ROOT / 'host-openssl'
OUT.mkdir(mode=0o700, exist_ok=True)
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'openssl-runtime-inputs.json')
source = ROOT / 'openssl-build-v2'
assert sha(source / 'built.json') == inputs['sourceBuildSha256']
built = read(source / 'built.json')
assert built['passed'] and built['network'] == 'none'
assert sha(source / 'build.log') == built['artifacts']['build.log']
assert 'Tests=4932' in (source / 'build.log').read_text() and 'Result: PASS' in (source / 'build.log').read_text()
target = OUT / 'prepared.json'
assert not target.exists()
assert shutil.disk_usage(OUT).free >= inputs['minimumFreeBytes']
names = ['libssl3t64', 'openssl-provider-legacy', 'openssl', 'libssl-dev']
old_version = '3.5.7-1~deb13u3'
new_version = '3.5.9-1~deb13u1+utilibre1'
rollback = read(OUT / 'rollback/authenticated.json')
assert len(rollback['packages']) == 4


def run(args, timeout=60):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, timeout=timeout).strip()


def packages():
    return run(['dpkg-query', '-W', '-f=${binary:Package}=${Version}\n'])


def services():
    return run(['systemctl', 'show', 'docker.service', 'ssh.service', 'qemu-guest-agent.service', 'dbus.service', '-p', 'Id', '-p', 'MainPID'])


before_packages, before_services = packages(), services()
assert run(['dpkg', '--audit']) == ''
config = sha('/etc/ssl/openssl.cnf')
records, checks = [], []
with tempfile.TemporaryDirectory(prefix='utilibre-host-openssl-') as temp:
    temporary = Path(temp)
    temporary.chmod(0o755)  # Only public software and fictional fixture data.
    candidate_files = []
    for phase in ('before', 'after'):
        dest = temporary / phase
        dest.mkdir(mode=0o755)
        for name in names:
            assert run(['dpkg-query', '-W', '-f=${Version}', name]) == old_version
            pin = inputs['packages'][name]
            assert pin['version'] == new_version
            archive = (OUT / 'rollback' / (name + '_' + old_version + '_amd64.deb')
                       if phase == 'before' else source / pin['file'])
            if phase == 'before':
                assert sha(archive) == next(p['sha256'] for p in rollback['packages'] if p['package'] == name)
            if phase == 'after':
                assert sha(archive) == pin['sha256'] == built['artifacts'][pin['file']]
                candidate_files.append(str(archive))
            assert run(['dpkg-deb', '-f', str(archive), 'Package']) == name
            assert run(['dpkg-deb', '-f', str(archive), 'Version']) == (old_version if phase == 'before' else new_version)
            subprocess.run(['dpkg-deb', '-x', str(archive), str(dest)], check=True, capture_output=True, timeout=30)
            control = OUT / (phase + '-' + name + '-control')
            assert not control.exists()
            subprocess.run(['dpkg-deb', '-e', str(archive), str(control)], check=True, capture_output=True, timeout=30)
            records.append({'phase': phase, 'package': name, 'archive': str(archive), 'sha256': sha(archive),
                'control': {p.name: sha(p) for p in control.iterdir() if p.is_file()}})
        # Verify the preserved rollback is the actual native host baseline.
        if phase == 'before':
            count = 0
            for p in (dest / 'usr').rglob('*'):
                if p.is_symlink():
                    actual = Path('/') / p.relative_to(dest)
                    assert actual.is_symlink() and os.readlink(actual) == os.readlink(p)
                elif p.is_file() and not str(p.relative_to(dest)).startswith(('usr/share/doc/', 'usr/share/man/')):
                    assert sha(p) == sha(Path('/') / p.relative_to(dest))
                    count += 1
            assert count > 100
        for p in dest.rglob('*'):
            if p.is_dir():
                p.chmod(p.stat().st_mode | 0o555)
        script = temporary / 'crypto.sh'
        fixture = HERE.parent / 'openssl-bookworm-followup/native-crypto.sh'
        assert sha(fixture) == inputs['nativeFixture']['cryptoSha256']
        script.write_bytes(fixture.read_bytes())
        script.chmod(0o444)
        prefix = ['unshare', '--net', '--', 'runuser', '-u', 'nobody', '--',
            'prlimit', '--as=536870912', '--cpu=60', '--nofile=128', '--core=0', '--',
            'env', '-i', 'PATH=' + str(dest / 'usr/bin') + ':/usr/bin:/bin',
            'LD_LIBRARY_PATH=' + str(dest / 'usr/lib/x86_64-linux-gnu'),
            'OPENSSL_MODULES=' + str(dest / 'usr/lib/x86_64-linux-gnu/ossl-modules'),
            'OPENSSL_CONF=/etc/ssl/openssl.cnf']
        linkage = run(prefix + ['ldd', str(dest / 'usr/bin/openssl')])
        assert str(dest / 'usr/lib/x86_64-linux-gnu/libcrypto.so.3') in linkage
        assert str(dest / 'usr/lib/x86_64-linux-gnu/libssl.so.3') in linkage
        assert 'not found' not in linkage
        result = subprocess.run(prefix + ['sh', str(script)], capture_output=True, timeout=75)
        (OUT / (phase + '-crypto.log')).write_bytes(result.stdout + result.stderr)
        assert result.returncode == 0 and result.stdout.strip() == b'OPENSSL_NATIVE_RSA_ECDSA_TAMPER_AES_PBKDF2_RANDOM_PROVIDERS_PASSED'
        checks.append({'phase': phase, 'nativeCryptoChecks': 8, 'passed': True,
                       'version': run(prefix + ['openssl', 'version']), 'linkageSha256': hashlib.sha256(linkage.encode()).hexdigest()})
    simulation = run(['apt-get', '--simulate', '--no-download', '--no-install-recommends', 'install', *candidate_files])
    (OUT / 'apt-simulation.txt').write_text(simulation + '\n')
    assert sorted(line.split()[1] for line in simulation.splitlines() if line.startswith('Inst ')) == sorted(names)
    assert not any(line.startswith('Remv ') for line in simulation.splitlines())
assert packages() == before_packages and services() == before_services
assert sha('/etc/ssl/openssl.cnf') == config and run(['dpkg', '--audit']) == ''
target.write_text(json.dumps({'schemaVersion': 1, 'date': dt.datetime.now(dt.timezone.utc).isoformat(),
    'passed': True, 'sourceBuildSha256': inputs['sourceBuildSha256'], 'sourceNativeTests': 4932,
    'oldVersion': old_version, 'newVersion': new_version, 'records': records, 'checks': checks,
    'rollbackPayloadMatchesHost': True, 'onlyFourPackagesInSimulation': True,
    'packageInventorySha256': hashlib.sha256(before_packages.encode()).hexdigest(),
    'hostConfigurationSha256': config, 'servicePidsUnchanged': True, 'network': 'none in native verification',
    'productionChanged': False, 'deploymentApproved': False,
    'limitation': 'Preparation only. Maintainer scripts and active host library consumers require separate release review; no host package, process or boot file changed.'}, indent=2) + '\n')
print('Four host OpenSSL packages prepared; isolated crypto and exact rollback checks passed. Not installed.')

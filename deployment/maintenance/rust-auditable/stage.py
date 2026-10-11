#!/usr/bin/env python3
"""Same-source Rust inventory rebuild; never starts or changes a live service."""
import argparse
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[3]
SPECS = {
    'chhoto': {
        'source': '/opt/utilibre/calendar-src/chhoto-url',
        'revision': 'e18a8a0111e94be03145e95c30dcd7f41891633d',
        'image': 'sha256:3efe81f9733cdac5b712c17b14e995f083adc0d7577cb7098425f936389051af',
        'candidate': 'utilibre-chhoto:7.8.3-auditable-20261011',
        'dockerfile': 'deployment/chhoto/Dockerfile',
        'native': 'backend', 'binary': 'chhoto-url', 'destination': '/app/chhoto-url',
    },
    'rustpad': {
        'source': '/opt/utilibre/community-src/rustpad',
        'revision': '54e4a9383c84d7317af42a7ddb177ce8bcba058d',
        'image': 'sha256:fc150bbee49652cd2f71345652efd82ac70e5053350328ea4df36682154440f4',
        'candidate': 'utilibre-rustpad:54e4a93-auditable-20261011',
        'dockerfile': 'deployment/rustpad/Builder.Dockerfile',
        'native': '.', 'binary': 'rustpad-server', 'destination': '/rustpad-server',
    },
}

def run(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def disk_gate():
    if shutil.disk_usage('/').free < 8 * 1024**3:
        raise RuntimeError('Less than 8 GiB free: stop this build; never prune unrelated files.')

def prepare_target(report, native):
    """Bounded volatile build storage; only this invocation's generated target."""
    target = Path('/run/utilibre-rust-build')/report.name
    available = next(int(line.split()[1])*1024 for line in Path('/proc/meminfo').read_text().splitlines() if line.startswith('MemAvailable:'))
    if not os.path.ismount(target):
        if available < 8*1024**3:
            raise RuntimeError('Need 8 GiB available RAM before allocating bounded compiler tmpfs')
        target.mkdir(parents=True,mode=0o700,exist_ok=True)
        assert not any(target.iterdir()), 'Never mount over existing files'
        run('mount','-t','tmpfs','-o','size=4G,mode=0700,nosuid,nodev','tmpfs',str(target))
    previous = native/'target'
    assert previous.is_relative_to(report)
    if previous.exists() and any(previous.iterdir()):
        shutil.copytree(previous,target,dirs_exist_ok=True)
        shutil.rmtree(previous)
    previous.mkdir(exist_ok=True)
    return target

def finish_image(app, spec, report):
    output = report/'output'; native = report/'source'/spec['native']
    section = subprocess.check_output(['readelf', '-SW', str(output/'app')], text=True)
    assert '.dep-v0' in section, 'Build must retain actual cargo-auditable metadata'
    assert 'test result: ok.' in (report/'native.log').read_text()
    # BuildKit interprets a bare sha256 as a Docker Hub repository. Resolve a
    # task-specific local tag from the immutable ID, then assert that identity.
    base = f'maintenance-{app}-auditable-base:20261011'
    run('docker','tag',spec['image'],base)
    actual = json.loads(subprocess.check_output(['docker','image','inspect',base],text=True))[0]['Id']
    assert actual == spec['image']
    run('docker', 'build', '-f', str(Path(__file__).with_name('Dockerfile.overlay')),
        '--build-arg', 'BASE='+base, '--build-arg', 'BINARY_DEST='+spec['destination'],
        '-t', spec['candidate'], str(output))
    image = json.loads(subprocess.check_output(['docker','image','inspect',spec['candidate']],text=True))[0]
    record = {'application': app, 'source': spec['revision'], 'baseImage': spec['image'],
        'candidate': spec['candidate'], 'imageId': image['Id'], 'binarySha256': digest(output/'app'),
        'binaryBytes': (output/'app').stat().st_size, 'cargoLockSha256': digest(native/'Cargo.lock'),
        'auditableVersion': '0.7.7', 'nativeTests': True, 'depV0': True,
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'cpuLimit': 2, 'compilerMemoryBytes': 3*1024**3, 'targetTmpfsMaxBytes':4*1024**3,
        'productionChanged': False}
    (report/'receipt.json').write_text(json.dumps(record,indent=2)+'\n')
    print(json.dumps(record), flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('app', choices=SPECS)
    parser.add_argument('--resume', type=Path, help='Resume only this app\'s owned interrupted report directory')
    parser.add_argument('--package-only',action='store_true',help='Package an already compiled and tested executable from --resume')
    args = parser.parse_args()
    app, spec = args.app, SPECS[args.app]
    os.umask(0o077)
    disk_gate()
    report = args.resume.resolve() if args.resume else Path(tempfile.mkdtemp(prefix=f'{app}-auditable-', dir='/opt/utilibre/reports'))
    assert report.parent == Path('/opt/utilibre/reports') and report.name.startswith(app+'-auditable-')
    source, output = report/'source', report/'output'
    output.mkdir(exist_ok=bool(args.resume))
    print(f'Report: {report}', flush=True)
    recipe = ROOT/'deployment'/app
    if args.resume:
        assert subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()==spec['revision']
        expected_lock = ROOT/'deployment/maintenance/chhoto-source/Cargo.lock' if app=='chhoto' else recipe/'Cargo.lock'
        assert digest(source/spec['native']/'Cargo.lock') == digest(expected_lock)
        if args.package_only:
            finish_image(app,spec,report)
            return
    else:
        assert not args.package_only, '--package-only requires --resume'
        run('git', 'clone', '--quiet', '--no-hardlinks', spec['source'], str(source))
        run('git', '-C', str(source), 'checkout', '--quiet', '--detach', spec['revision'])
        if app == 'chhoto':
            for patch in ['no-analytics-local-assets.patch', 'layout.patch']:
                run('git', '-C', str(source), 'apply', str(recipe/patch))
            assert digest(source/'backend/Cargo.lock') == digest(ROOT/'deployment/maintenance/chhoto-source/Cargo.lock')
        else:
            run('python3', str(recipe/'apply-patches.py'), str(source))
            with (source/'rustpad-server/src/rustpad.rs').open('a') as file:
                file.write((recipe/'bounds-unit.rs').read_text())
            shutil.copy2(recipe/'bounds-integration.rs', source/'rustpad-server/tests/utilibre_bounds.rs')
            shutil.copy2(recipe/'Cargo.lock', source/'Cargo.lock')
    builder = f'maintenance-{app}-auditable-toolchain:20261011'
    with (report/'toolchain.log').open('w') as log:
        run('docker', 'build', '--target', 'audit-toolchain', '-f', str(ROOT/spec['dockerfile']), '-t', builder, str(recipe), stdout=log, stderr=subprocess.STDOUT)
    disk_gate()
    native = source/spec['native']
    target = prepare_target(report, native)
    registry = target/'.cargo-registry'
    registry.mkdir(exist_ok=True)
    selected = '' if app == 'chhoto' else ' -p rustpad-server'
    # Ordinary files under this new owned directory, not a shared build cache or
    # live volume. Docker enforces RAM, CPU and PID ceilings for the compiler.
    name = f'maintenance-{app}-auditable-{report.name.rsplit("-",1)[-1]}'
    command = ('set -eu; rustc -vV > /out/rustc.txt; cargo --version > /out/cargo.txt; '
        'sha256sum /usr/local/bin/cargo-auditable > /out/cargo-auditable-binary-sha256.txt; '
        'apk list --installed > /out/builder-packages.txt; '
        f'cargo tree --locked --edges normal{selected} > /out/selected-dependencies.txt; '
        'cargo auditable test --locked --release -- --test-threads=2; '
        f'cargo auditable build --locked --release{selected}; '
        'find /usr/local/rustup -path "*/self-contained/libc.a" -exec sha256sum {} \\; > /out/linked-libc-sha256.txt; '
        'find /usr/local/cargo/registry/src -path "*/libsqlite3-sys-*/sqlite3/sqlite3.h" '
        '-exec grep "^#define SQLITE_VERSION " {} \\; > /out/bundled-sqlite-version.txt; '
        f'cp target/release/{spec["binary"]} /out/app')
    with (report/'native.log').open('a' if args.resume else 'w') as log:
        process = subprocess.Popen(['docker', 'run', '--rm', '--name', name,
            '--memory', '3g', '--memory-swap', '3g', '--cpus', '2', '--pids-limit', '256',
            '-e', 'CARGO_BUILD_JOBS=2', '-v', f'{native}:/work', '-v', f'{target}:/work/target',
            '-v', f'{registry}:/usr/local/cargo/registry', '-v', f'{output}:/out',
            '-w', '/work', builder, 'sh', '-c', command], stdout=log, stderr=subprocess.STDOUT)
        try:
            while process.poll() is None:
                disk_gate()
                time.sleep(2)
            if process.returncode:
                raise RuntimeError(f'Native build failed; see {report}/native.log')
        except BaseException:
            subprocess.run(['docker', 'stop', '-t', '10', name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            process.wait()
            raise
    # Dropping only this invocation's tmpfs discards generated compilation cache.
    run('umount',str(target)); target.rmdir()
    finish_image(app,spec,report)

if __name__ == '__main__':
    main()

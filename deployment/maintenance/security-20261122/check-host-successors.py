"""Read-only provenance and native checks for the independent post-boot APT update.

Does not overwrite the original four-package release or its failed inventory
gate. No package installation, sudo command execution, guest-agent operation,
network request or service restart. Synthetic QMP uses disposable files only.
"""
import datetime as dt
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/host-successors')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
acquired = json.loads((ROOT / 'authenticated.json').read_text())
spec = importlib.util.spec_from_file_location('patch_hunks', HERE / 'check-successor-patches.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
assert not (ROOT / 'verified.json').exists(), 'Preserve completed evidence'
for row in acquired['sources']:
    for file in row['files']:
        assert sha(ROOT / file['file']) == file['sha256']
payloads, patches = [], []

with tempfile.TemporaryDirectory(prefix='host-successors-', dir=ROOT) as temporary:
    work = Path(temporary)
    for row in acquired['packages']:
        archive = ROOT / row['file']
        assert sha(archive) == row['sha256']
        assert subprocess.check_output(['dpkg-query', '-W', '-f=${Version}', row['name']], text=True, timeout=15) == row['version']
        dest = work / row['name']
        subprocess.run(['dpkg-deb', '-x', str(archive), str(dest)], check=True, capture_output=True, timeout=40)
        files = {}
        for base, dirs, names in os.walk(dest):
            for name in dirs + names:
                expected = Path(base) / name
                relative = expected.relative_to(dest)
                actual = Path('/') / relative
                # Administrator conffiles are not replaced by this check.
                if relative.parts[0] == 'etc' or expected.is_dir() and not expected.is_symlink():
                    continue
                if expected.is_symlink():
                    assert actual.is_symlink() and os.readlink(actual) == os.readlink(expected), str(relative)
                    files[str(relative)] = {'link': os.readlink(actual)}
                else:
                    assert sha(expected) == sha(actual), str(relative)
                    assert expected.stat().st_mode & 0o7777 == actual.stat().st_mode & 0o7777, str(relative)
                    files[str(relative)] = {'sha256': sha(actual)}
        payloads.append({'package': row['name'], 'version': row['version'], 'archiveSha256': row['sha256'], 'verifiedFiles': files})

    old = Path('/var/lib/utilibre-maintenance/sudo-followup-20261012')
    with tarfile.open(ROOT / 'sudo_1.9.16p2-3+deb13u5.debian.tar.xz') as tar:
        for commit, suffix in [('db669167ca599f2a94cd8a4c5fae9e473c81a2fd', '0011-sudo-ignore-user-specified-TZ-environment-variable.patch'),
                               ('1820a349687522f51023d1ae5925125f59679a8c', '0012-Remove-TZ-from-sudo-s-working-environment-without-mo.patch')]:
            previous = old / 'sources' / (commit + '.patch')
            vendor = tar.extractfile('debian/patches/' + suffix).read()
            assert module.hunks(previous.read_bytes()) == module.hunks(vendor)
            patches.append({'source': 'sudo', 'previousSha256': sha(previous), 'vendorPatchSha256': hashlib.sha256(vendor).hexdigest(), 'orderedHunksIdentical': True})
        third = tar.extractfile('debian/patches/0013-Copy-envp-submit_envp-instead-of-replacing-the-envir.patch').read()
    target = work / 'src/sudo.c'
    target.parent.mkdir()
    target.write_bytes((old / 'trixie/output/repaired-sudo.c').read_bytes())
    for check in (True, False):
        subprocess.run(['git', 'apply', *(['--check'] if check else []), '-'], input=third, cwd=work, check=True, capture_output=True, timeout=15)
    source = target.read_text()
    # Independently reconstruct the tested source from the authenticated
    # upstream archive and ordered Debian patches, not just the saved repair.
    orig = old / 'sources/sudo_1.9.16p2.orig.tar.gz'
    assert sha(orig) == '976aa56d3e3b2a75593307864288addb748c9c136e25d95a9cc699aafa77239c'
    clean = work / 'authenticated'
    clean_target = clean / 'src/sudo.c'
    clean_target.parent.mkdir(parents=True)
    with tarfile.open(orig) as tar:
        name = next(n for n in tar.getnames() if n.endswith('/src/sudo.c'))
        clean_target.write_bytes(tar.extractfile(name).read())
    with tarfile.open(ROOT / 'sudo_1.9.16p2-3+deb13u5.debian.tar.xz') as tar:
        series = tar.extractfile('debian/patches/series').read().decode()
        for name in [line.split()[0] for line in series.splitlines() if line.strip() and not line.startswith('#')]:
            blob = tar.extractfile('debian/patches/' + name).read()
            sections = [b'diff --git ' + p for p in re.split(rb'(?m)^diff --git ', blob)[1:]
                        if p.split(b'\n', 1)[0].split()[1] == b'b/src/sudo.c']
            for section in sections:
                for check in (True, False):
                    subprocess.run(['git', 'apply', *(['--check'] if check else []), '-'], input=section,
                                   cwd=clean, check=True, capture_output=True, timeout=15)
    assert clean_target.read_bytes() == target.read_bytes()
    assert source.index('    os_init(argc, argv, envp);') < source.index('    set_time_zone();') < source.index('    sudo_check_suid(')

    def function(name):
        start = source.index('\n' + name + '(') + 1
        return source[start:source.index('\n}', start) + 2]

    # Reuse the existing ordinary-user environment regression fixture, adapting
    # only the upstream change from an environ copy to a submit_envp copy.
    fixture = (old / 'trixie/output/timezone-native.c').read_text()
    previous_source = (old / 'trixie/output/repaired-sudo.c').read_text()
    for name in ('set_time_zone', 'os_init_common'):
        start = previous_source.index('\n' + name + '(') + 1
        previous_fn = previous_source[start:previous_source.index('\n}', start) + 2]
        assert fixture.count(previous_fn) == 1
        fixture = fixture.replace(previous_fn, function(name))
    replacements = {
        'static void gc_init(void) {}': 'static char **submit_envp;\nstatic void gc_init(void) {}',
        'assert(environ!=original);': 'assert(submit_envp!=original && submit_envp[0]==original[0]);',
        'assert(strcmp(original[0],"TZ=UTC+01")==0 && original[2]==NULL);': 'assert(strcmp(submit_envp[0],"TZ=UTC+01")==0 && submit_envp[2]==NULL);',
    }
    for before, after in replacements.items():
        assert fixture.count(before) == 1
        fixture = fixture.replace(before, after)
    (ROOT / 'sudo-environment-native.c').write_text(fixture)
    with tempfile.TemporaryDirectory(prefix='sudo-vendor-native-', dir='/tmp') as native:
        native = Path(native)
        native.chmod(0o755)
        (native / 'fixture.c').write_text(fixture)
        subprocess.run(['cc', '-std=c11', '-O2', '-Wall', '-Wextra', '-Wno-unused-parameter', str(native / 'fixture.c'), '-o', str(native / 'fixture')], check=True, capture_output=True, timeout=30)
        result = subprocess.run(['unshare', '--net', '--', 'setpriv', '--reuid=65534', '--regid=65534', '--clear-groups', '--no-new-privs', str(native / 'fixture')], capture_output=True, timeout=15)
        (ROOT / 'sudo-native.log').write_bytes(result.stdout + result.stderr)
        assert result.returncode == 0 and b'SUDO_ENVIRONMENT_HELPERS_PASSED' in result.stdout
    patches.append({'source': 'sudo', 'additionalVendorPatchSha256': hashlib.sha256(third).hexdigest(), 'sourceSha256': sha(target), 'nativeFixtureSha256': sha(ROOT / 'sudo-environment-native.c'), 'unprivilegedEnvironmentChecks': True})

    with tarfile.open(ROOT / 'qemu_11.1.3+ds.orig.tar.xz') as tar:
        for relative, patch in [
            ('io/channel-websock.c', Path('/var/lib/utilibre-maintenance/security-20261114/qemu/68df2cefcfe6eb3df4c0531cea4d9125742bc9df.patch')),
            ('qga/commands-posix-ssh.c', Path('/var/lib/utilibre-maintenance/qga-native-followup-20261012/inputs/guest-agent-332ab334bc6b0b43bc17c90820fec068b63a666b.patch')),
        ]:
            matches = [n for n in tar.getnames() if n.endswith('/' + relative)]
            assert len(matches) == 1
            dest = work / relative
            dest.parent.mkdir(exist_ok=True, parents=True)
            dest.write_bytes(tar.extractfile(matches[0]).read())
            subprocess.run(['git', 'apply', '--reverse', '--check', str(patch)], cwd=work, check=True, capture_output=True, timeout=15)
            patches.append({'source': 'qemu', 'path': relative, 'sourceSha256': sha(dest), 'retainedPatchSha256': sha(patch), 'strictReverseCheckPassed': True})

subprocess.run(['/usr/sbin/visudo', '-c'], check=True, capture_output=True, timeout=20)
original = HERE.parent / 'security-20261114/check-qemu-tools.py'
code = original.read_text()
replacements = {
    "r=Path('/var/lib/utilibre-maintenance/security-20261114/qemu/native')": 'r=Path(' + repr(str(ROOT)) + ')',
    "(work/n).write_bytes((r/n).read_bytes())": "(work/n).write_bytes((Path('/var/lib/utilibre-maintenance/security-20261114/qemu/native')/n).read_bytes())",
    "[('before',Path('/usr/bin')),('candidate',work)]": "[('installed-vendor-successor',Path('/usr/bin')),('preserved-local-predecessor',work)]",
}
for before, after in replacements.items():
    assert code.count(before) == 1
    code = code.replace(before, after)
adapter = ROOT / 'check-qemu-tools.py'
adapter.write_text(code)
subprocess.run(['python3', str(adapter)], check=True, capture_output=True, timeout=150)
proof = {'passed': True, 'checkedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
         'acquisitionSha256': sha(ROOT / 'authenticated.json'), 'payloads': payloads, 'retainedRepairs': patches,
         'qemuNativeSha256': sha(ROOT / 'native-check.json'), 'qemuOriginalFixtureSha256': sha(original),
         'qemuAdaptedFixtureSha256': sha(adapter), 'sudoConfigurationValid': True,
         'productionChanged': False, 'network': 'none', 'guestAgentCommands': False,
         'limitations': 'Three installed package successors only; source preservation and native compatibility, not exploit reproduction or a full review of every independent APT change.'}
(ROOT / 'verified.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Installed sudo/QEMU package bytes, retained source repairs and isolated native checks passed; no host mutation.')

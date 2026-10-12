#!/usr/bin/env python3
"""Build and compare four runtime-only dependency reductions; no live mutation."""
import datetime, hashlib, json, os, pathlib, shutil, subprocess, sys, tarfile

HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path('/var/lib/utilibre-maintenance/runtime-gnutls-minimization-20261012')
SPECS = json.loads((HERE / 'specs.json').read_text())
os.umask(0o077)

def run(args, **kw):
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, **kw).strip()

def inspect(ref):
    return json.loads(run(['docker', 'image', 'inspect', ref]))[0]

def isolated(image, args):
    return run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--user', '0',
                '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '1',
                '--memory', '512m', '--pids-limit', '64', '--entrypoint', args[0], image, *args[1:]])

def packages(image):
    text = isolated(image, ['dpkg-query', '-W', '-f=${binary:Package}\t${Version}\t${Status}\t${Depends}\t${Pre-Depends}\n'])
    return {r.split('\t')[0]: r.split('\t')[1:] for r in text.splitlines() if '\tinstall ok installed\t' in r}

def manifest(image):
    # Export a NEW, never-started image container. No live state or real volumes.
    cid = run(['docker', 'create', '--entrypoint', '/bin/true', image])
    try:
        proc = subprocess.Popen(['docker', 'export', cid], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        result = {}
        with tarfile.open(fileobj=proc.stdout, mode='r|') as archive:
            for entry in archive:
                name = '/' + entry.name.lstrip('./')
                if name in ['/etc/hosts', '/etc/hostname', '/etc/resolv.conf', '/.dockerenv']:
                    continue
                data = {'type': entry.type.decode(), 'mode': entry.mode, 'uid': entry.uid, 'gid': entry.gid,
                        'size': entry.size, 'link': entry.linkname}
                if entry.isfile():
                    digest = hashlib.sha256()
                    file = archive.extractfile(entry)
                    while chunk := file.read(1024 * 1024):
                        digest.update(chunk)
                    data['sha256'] = digest.hexdigest()
                result[name] = data
        error = proc.stderr.read().decode()
        assert proc.wait() == 0, error
        return result
    finally:
        run(['docker', 'rm', '-v', cid])

for spec in SPECS:
    if sys.argv[1:] and spec['key'] not in sys.argv[1:]:
        continue
    assert shutil.disk_usage('/').free >= 8 * 1024 ** 3, 'Keep 8 GiB recovery floor'
    out = OUT / 'images' / spec['key']; out.mkdir(parents=True, exist_ok=True)
    before = inspect(spec['base'])
    assert inspect(spec['baseTag'])['Id'] == spec['base']
    assert run(['docker', 'inspect', '--format', '{{.Image}}', spec['container']]) == spec['base']
    before_packages = packages(spec['base'])
    assert before_packages['apt'][0] == '2.6.1'
    assert before_packages['libgnutls30:amd64'][0] == '3.7.9-2+deb12u7'
    dependents = sorted(p for p, row in before_packages.items() if 'libgnutls30' in '\t'.join(row[2:]))
    assert dependents == ['apt'], dependents
    owned = set(isolated(spec['base'], ['dpkg-query', '-L', 'apt', 'libgnutls30']).splitlines())
    old_manifest = manifest(spec['base'])
    # Debian's merged-/usr package lists may name /lib while Docker exports
    # the same owned file at /usr/lib. Resolve only a verified root symlink.
    for prefix in ['/lib', '/bin', '/sbin', '/lib64']:
        link = old_manifest.get(prefix, {})
        if link.get('type') == '2' and link.get('link') == 'usr' + prefix:
            owned.update('/usr' + p for p in list(owned) if p.startswith(prefix + '/'))
    (out / 'filesystem-before.json').write_text(json.dumps(old_manifest, sort_keys=True) + '\n')
    with (out / 'build.log').open('w') as log:
        subprocess.run(['docker', 'build', '--pull=false', '--memory=2g',
                        '--cpuset-cpus=' + str(min(os.sched_getaffinity(0))), '--network=none',
                        '--build-arg', 'BASE=' + spec['base'], '--build-arg', 'RESTORE_USER=' + before['Config']['User'],
                        '-t', spec['candidate'], '-f', str(HERE / 'Dockerfile'), str(HERE)],
                       env={**os.environ, 'DOCKER_BUILDKIT': '0'}, stdout=log, stderr=log, check=True)
    after = inspect(spec['candidate'])
    old_config = dict(before['Config']); new_config = dict(after['Config'])
    # Docker's legacy builder stores its parent ID in this non-runtime field.
    old_config.pop('Image', None); new_config.pop('Image', None)
    assert old_config == new_config, 'Runtime image configuration changed'
    after_packages = packages(spec['candidate'])
    removed = sorted(set(before_packages) - set(after_packages))
    assert removed == ['apt', 'libgnutls30:amd64'], removed
    assert all(before_packages[p] == row for p, row in after_packages.items())
    assert isolated(spec['candidate'], ['dpkg', '--audit']) == ''
    assert 'install ok installed' in isolated(spec['candidate'], ['dpkg-query', '-W', '-f=${Status}', 'dpkg'])
    new_manifest = manifest(spec['candidate'])
    (out / 'filesystem-after.json').write_text(json.dumps(new_manifest, sort_keys=True) + '\n')
    changed = sorted(p for p in set(old_manifest) | set(new_manifest) if old_manifest.get(p) != new_manifest.get(p))
    exact_metadata = {'/var/lib/dpkg/status', '/var/lib/dpkg/status-old', '/var/log/dpkg.log',
                      '/var/lib/dpkg/triggers/Unincorp', '/var/cache/ldconfig/aux-cache', '/etc/ld.so.cache'}
    def permitted(p):
        return p in owned or p in exact_metadata or any(p.startswith('/var/lib/dpkg/info/' + n) for n in ['apt.', 'libgnutls30:amd64.'])
    unexpected = [p for p in changed if not permitted(p)]
    (out / 'changed-paths.json').write_text(json.dumps({'changed': changed, 'unexpected': unexpected}, indent=2) + '\n')
    assert not unexpected, unexpected
    assert not any('libgnutls.so' in p for p in new_manifest), 'Actual vulnerable shared object remains'
    assert not any(p in new_manifest for p in ['/usr/bin/apt', '/usr/bin/apt-get'])
    receipt = {**spec, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'imageId': after['Id'],
               'passed': True, 'configurationUnchanged': True, 'filesystemParity': True,
               'filesystemFilesBefore': len(old_manifest), 'filesystemFilesAfter': len(new_manifest),
               'changedPaths': changed, 'packageRemovalExact': removed, 'packagesBefore': before_packages,
               'packagesAfter': after_packages, 'gnutlsReverseDependencies': dependents,
               'buildCapableBaseRetained': inspect(spec['baseTag'])['Id'] == spec['base'],
               'limitations': ['Native application tests and scanner comparison are separate gates.',
                              'Final runtime lacks apt; rebuild future apt-based patches from the retained immutable base, then reapply this layer.']}
    (out / 'build.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(spec['key'] + ': candidate built, exact package removal and filesystem/config parity passed', flush=True)

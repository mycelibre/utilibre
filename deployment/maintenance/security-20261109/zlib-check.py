"""Finite zlib-only scope and existing native runtime checks; never releases."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import uuid
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/zlib')
INPUTS = json.loads((HERE / 'zlib-inputs.json').read_text())
LIMITS = ['--network', 'none', '--read-only', '--cap-drop', 'ALL',
          '--security-opt', 'no-new-privileges', '--cpus', '1', '--memory', '256m',
          '--memory-swap', '256m', '--pids-limit', '64', '--log-driver', 'none']

def run(args, timeout=240):
    p = subprocess.run(args, capture_output=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError(p.stdout.decode(errors='replace') + p.stderr.decode(errors='replace'))
    return p.stdout

def sha(data):
    return hashlib.sha256(data).hexdigest()

def image_file(image, path):
    return run(['docker', 'run', '--rm', *LIMITS, '--user', '0', '--entrypoint', 'cat', image, path])

def inventory(data):
    rows = {}
    for record in data.decode().split('\n\n'):
        if not record.strip():
            continue
        name = next(line[2:] for line in record.splitlines() if line.startswith('P:'))
        assert name not in rows
        rows[name] = record
    return rows

def export_manifest(image):
    """Hash an unstarted image stream. No image filesystem is extracted or executed."""
    name = 'utilibre-zlib-scope-' + uuid.uuid4().hex[:12]
    ignored = {'.dockerenv', 'etc/hostname', 'etc/hosts', 'etc/resolv.conf'}
    result = {}
    try:
        run(['docker', 'create', '--name', name, *LIMITS, '--entrypoint', '/bin/true', image])
        with tempfile.TemporaryFile() as errors:
            proc = subprocess.Popen(['docker', 'export', name], stdout=subprocess.PIPE, stderr=errors)
            try:
                with tarfile.open(fileobj=proc.stdout, mode='r|') as stream:
                    for member in stream:
                        path = member.name.removeprefix('./').rstrip('/')
                        if path in ignored:
                            continue
                        assert path not in result and not path.startswith('/') and '..' not in path.split('/')
                        row = {'type': member.type.decode(), 'mode': member.mode, 'uid': member.uid,
                               'gid': member.gid, 'link': member.linkname}
                        if member.isfile():
                            h = hashlib.sha256()
                            with stream.extractfile(member) as source:
                                for block in iter(lambda: source.read(1024 * 1024), b''):
                                    h.update(block)
                            row.update(size=member.size, sha256=h.hexdigest())
                        result[path] = row
                assert proc.wait(timeout=30) == 0
            finally:
                if proc.poll() is None:
                    proc.kill()
                proc.wait(timeout=30)
                proc.stdout.close()
    finally:
        run(['docker', 'rm', '-v', name])
    return result

def symbols(path):
    lines = run(['readelf', '--dyn-syms', '--wide', str(path)]).decode().splitlines()
    return {p[7].split('@')[0] for line in lines if len(p := line.split()) >= 8
            and p[4] in ('GLOBAL', 'WEAK') and p[6] != 'UND'}

def scope(key):
    spec = next(row for row in INPUTS['rows'] if row['key'] == key)
    out = ROOT / key
    assert not (out / 'scope.json').exists(), 'Preserve prior proof'
    build = json.loads((out / 'stage.json').read_text())
    assert build['base'] == spec['base'] and build['configurationUnchanged']
    base, image = build['base'], build['imageId']
    before, after = export_manifest(base), export_manifest(image)
    olddb, newdb = inventory(image_file(base, '/lib/apk/db/installed')), inventory(image_file(image, '/lib/apk/db/installed'))
    assert olddb.keys() == newdb.keys()
    assert {k: v for k, v in olddb.items() if k != 'zlib'} == {k: v for k, v in newdb.items() if k != 'zlib'}, 'Non-zlib APK metadata changed'
    oldfiles = run(['docker', 'run', '--rm', *LIMITS, '--user', '0', '--entrypoint', 'apk', base, 'info', '-L', 'zlib']).decode().splitlines()[1:]
    newfiles = run(['docker', 'run', '--rm', *LIMITS, '--user', '0', '--entrypoint', 'apk', image, 'info', '-L', 'zlib']).decode().splitlines()[1:]
    payload = {path for path in oldfiles + newfiles if path}
    assert payload and all(path.startswith('usr/lib/libz.so.') for path in payload), payload
    allowed = payload | {'lib/apk/db/installed', 'etc/apk/world'}
    changed = {path: {'before': before.get(path), 'after': after.get(path)} for path in sorted(before.keys() | after.keys()) if before.get(path) != after.get(path)}
    assert changed and set(changed) <= allowed, 'Unexpected image file changes: ' + repr(set(changed) - allowed)
    worlds = [image_file(i, '/etc/apk/world').decode().splitlines() for i in (base, image)]
    def zlib_constraint(value):
        return value == 'zlib' or value.startswith(('zlib=', 'zlib><'))
    assert [v for v in worlds[0] if not zlib_constraint(v)] == [v for v in worlds[1] if not zlib_constraint(v)]
    for world, record, version in zip(worlds, [olddb['zlib'], newdb['zlib']], ['1.3.2-r0', '1.4-r0']):
        checksum = next(line[2:] for line in record.splitlines() if line.startswith('C:'))
        assert all(v in ('zlib', 'zlib=' + version, 'zlib><' + checksum) for v in world if zlib_constraint(v))
    musl = 'lib/ld-musl-x86_64.so.1'
    assert before[musl] == after[musl]
    exports = []
    dynamic = []
    with tempfile.TemporaryDirectory(dir=out, prefix='abi-') as tmp:
        for n, identifier in enumerate((base, image)):
            lib = Path(tmp) / str(n)
            lib.write_bytes(image_file(identifier, '/usr/lib/libz.so.1'))
            exports.append(symbols(lib))
            dynamic.append([line.strip().split(')', 1)[1].strip() for line in run(['readelf', '-d', str(lib)]).decode().splitlines() if '(NEEDED)' in line or '(SONAME)' in line])
    assert exports[0] <= exports[1] and len(exports[0]) >= 80
    assert dynamic[0] == dynamic[1]
    proof = {'date': datetime.now(timezone.utc).isoformat(), 'passed': True, 'base': base,
             'imageId': image, 'changed': changed, 'imageEntries': [len(before), len(after)],
             'allUnrelatedImageFilesUnchanged': True, 'unrelatedApkRecordsUnchanged': True,
             'muslUnchanged': True, 'muslSha256': before[musl].get('sha256'),
             'zlibAbiPreserved': True, 'baselineExportedSymbols': len(exports[0]),
             'dependenciesAndSoname': dynamic[0], 'worldBefore': worlds[0], 'worldAfter': worlds[1],
             'scope': 'Full image file content/type/ownership/mode/link parity except exact zlib payload, installed APK record and zlib-only world entry; tar mtimes excluded.',
             'fixtureSha256': sha(Path(__file__).read_bytes())}
    (out / 'scope.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(key + ': exact zlib-only image scope passed', flush=True)

def consumer_runtime(keys):
    fixture = HERE / 'check-musl-runtimes.py'
    original = fixture.read_bytes()
    assert sha(original) == INPUTS['consumerFixtureHashes'][fixture.name]
    code = original.decode()
    assert code.count("ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/musl')") == 1
    assert code.count("HERE / 'musl-inputs.json'") == 1
    adapted = code.replace("ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/musl')", "ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/zlib')").replace("HERE / 'musl-inputs.json'", "HERE / 'zlib-inputs.json'")
    adapter = ROOT / 'runtime-adapter.py'
    if adapter.exists():
        assert adapter.read_text() == adapted
    else:
        adapter.write_text(adapted)
    sys.argv = [str(fixture), *keys]
    exec(compile(adapted, str(adapter), 'exec'), {'__file__': str(fixture), '__name__': '__main__'})
    for key in keys:
        path = ROOT / key / 'consumer.json'
        proof = json.loads(path.read_text())
        assert proof['fixtureSha256'] == sha(original)
        proof['adapter'] = {'path': str(adapter), 'sha256': sha(adapted.encode()),
                            'changes': ['private output root musl to zlib', 'finite input manifest filename musl to zlib'],
                            'originalFixture': str(fixture), 'originalSha256': sha(original)}
        path.write_text(json.dumps(proof, indent=2) + '\n')

if __name__ == '__main__':
    assert len(sys.argv) >= 3
    if sys.argv[1] == '--scope':
        assert len(sys.argv) == 3
        scope(sys.argv[2])
    elif sys.argv[1] == '--runtime':
        consumer_runtime(sys.argv[2:])
    else:
        raise AssertionError('Unsupported finite fixture selection')

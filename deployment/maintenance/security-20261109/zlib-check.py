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
LIBRARIES = '--libraries-nov11' in sys.argv
if LIBRARIES: sys.argv.remove('--libraries-nov11')
ROOT = Path('/var/lib/utilibre-maintenance/libraries-20261111' if LIBRARIES else '/var/lib/utilibre-maintenance/security-20261109/zlib')
INPUTS = json.loads((HERE / ('../releases-20261111/libraries-inputs.json' if LIBRARIES else 'zlib-inputs.json')).read_text())
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
    names = list(spec['packages']) if LIBRARIES else ['zlib']
    assert {k: v for k, v in olddb.items() if k not in names} == {k: v for k, v in newdb.items() if k not in names}, 'Unrelated APK metadata changed'
    payload = set()
    for name in names:
        for identifier in (base, image):
            files = run(['docker', 'run', '--rm', *LIMITS, '--user', '0', '--entrypoint', 'apk', identifier, '--no-network', 'info', '-L', name]).decode().splitlines()[1:]
            allowed_prefix = 'usr/lib/libz.so.' if name == 'zlib' else 'usr/lib/libXpm.so.'
            assert any(files) and all(not p or p.startswith(allowed_prefix) or name == 'libxpm' and p in ('usr/bin/cxpm','usr/bin/sxpm') for p in files)
            payload.update(p for p in files if p)
    allowed = payload | {'lib/apk/db/installed', 'etc/apk/world'}
    changed = {path: {'before': before.get(path), 'after': after.get(path)} for path in sorted(before.keys() | after.keys()) if before.get(path) != after.get(path)}
    assert changed and set(changed) <= allowed, 'Unexpected image file changes: ' + repr(set(changed) - allowed)
    worlds = [image_file(i, '/etc/apk/world').decode().splitlines() for i in (base, image)]
    def package_constraint(value, name):
        return value == name or value.startswith((name + '=', name + '><'))
    assert [v for v in worlds[0] if not any(package_constraint(v,n) for n in names)] == [v for v in worlds[1] if not any(package_constraint(v,n) for n in names)]
    for name in names:
        for world, database in zip(worlds, [olddb, newdb]):
            fields = {line[0]:line[2:] for line in database[name].splitlines() if line.startswith(('C:', 'V:'))}
            assert all(v in (name, name+'='+fields['V'], name+'><'+fields['C']) for v in world if package_constraint(v,name))
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
    xpm_abi = None
    if 'libxpm' in names:
        with tempfile.TemporaryDirectory(dir=out, prefix='xpm-abi-') as tmp:
            rows=[]
            for n, identifier in enumerate((base, image)):
                lib=Path(tmp)/str(n);lib.write_bytes(image_file(identifier, '/usr/lib/libXpm.so.4'))
                rows.append((symbols(lib),[line.strip().split(')',1)[1].strip() for line in run(['readelf','-d',str(lib)]).decode().splitlines() if '(NEEDED)' in line or '(SONAME)' in line]))
            assert rows[0][0] <= rows[1][0] and rows[0][1] == rows[1][1]
            xpm_abi={'preserved':True,'baselineExportedSymbols':len(rows[0][0]),'dependenciesAndSoname':rows[0][1]}
    proof = {'packages':names,'xpmAbi':xpm_abi,'date': datetime.now(timezone.utc).isoformat(), 'passed': True, 'base': base,
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
    adapted = code.replace("ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/musl')", "ROOT = Path('"+str(ROOT)+"')").replace("HERE / 'musl-inputs.json'", "HERE / '"+("../releases-20261111/libraries-inputs.json" if LIBRARIES else "zlib-inputs.json")+"'")
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

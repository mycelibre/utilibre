"""Rebuild the existing native fixture from exact local inputs, without network."""
import hashlib, json, os, subprocess, tarfile, tempfile
from pathlib import Path
os.umask(0o077)
here = Path(__file__).resolve().parent
root = Path('/var/lib/utilibre-maintenance/security-20261028')
pins = json.loads((here / 'expat-fixture.json').read_text())
specs = json.loads((here / 'expat-inputs.json').read_text())
sha = lambda b: hashlib.sha256(b).hexdigest()
source = Path('/var/lib/utilibre-maintenance/python-bookworm-followup-20261012/sources/expat_2.9.0.orig.tar.gz')
assert sha(source.read_bytes()) == pins['archiveSha256']
# Every replay gets its own directory; never overwrite the release fixture.
out = Path(tempfile.mkdtemp(prefix='fixture-replay-', dir=root / 'expat'))
out.chmod(0o755)
with tarfile.open(source) as archive:
    for name, expected in pins['headers'].items():
        data = archive.extractfile('libexpat-R_2_9_0/expat/lib/' + name).read()
        assert sha(data) == expected
        (out / name).write_bytes(data)
code = (here / 'expat-native.c').read_bytes()
assert sha(code) == pins['sourceSha256']
(out / 'check.c').write_bytes(code)
pkg = specs['packages']['3.24/libexpat-2.9.0-r0.apk']
apk = root / 'packages/alpine-3.24' / pkg['file']
assert sha(apk.read_bytes()) == pkg['sha256']
with tarfile.open(apk, 'r:gz', ignore_zeros=True) as archive:
    members = [m for m in archive if m.isfile() and m.name.startswith('usr/lib/libexpat.so.')]
    assert len(members) == 1
    (out / 'libexpat.so.1').write_bytes(archive.extractfile(members[0]).read())
for name in ['expat.h', 'expat_external.h', 'check.c', 'libexpat.so.1']:
    (out / name).chmod(0o644)
os.chown(out, 65534, 65534)
subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--read-only', '--user', '65534:65534',
                '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '128m', '--cpus', '1',
                '--tmpfs', '/tmp:rw,size=16m', '-v', str(out) + ':/fixture', '--entrypoint', 'gcc', pins['compiler'],
                '-Wall', '-Wextra', '-Werror', '-O2', '-I/fixture', '/fixture/check.c', '/fixture/libexpat.so.1',
                '-o', '/fixture/native'], check=True, timeout=60)
assert sha((out / 'native').read_bytes()) == pins['binarySha256']
print('Exact native fixture rebuilt; network disabled')
(out / 'replay.json').write_text(json.dumps({'passed': True, 'binarySha256': pins['binarySha256'], 'network': 'none'}, indent=2) + '\n')

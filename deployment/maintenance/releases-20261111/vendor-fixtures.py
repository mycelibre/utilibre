"""Build the two ordinary API checks from already acquired, pinned packages.

No downloads. SDK inputs are signature/hash checked; the compiler is pinned,
networkless and bounded. This does not install anything on the host.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile
import tempfile
import os

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/vendor-libs-20261111')
I = json.loads((HERE/'vendor-inputs.json').read_text())
F = I['nativeFixture']
LIMITS = ['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
          '--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none']
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(args): return subprocess.run(args,capture_output=True,timeout=90,check=True).stdout
out = ROOT/'fixture'; out.mkdir(exist_ok=True)
sources = {'xslt-native':HERE/'xslt-native.c', 'kerberos-native':HERE.parent/'security-20261110/kerberos-native.c'}
for name,p in sources.items(): assert sha(p) == F['sources'][name]
if all((out/n).is_file() for n in F['binaries']):
    for n,h in F['binaries'].items(): assert sha(out/n) == h, 'Changed fixture; do not overwrite'
    print('Exact pinned native fixtures already present; no changes')
    raise SystemExit(0)
assert not any((out/n).exists() for n in F['binaries']), 'Partial fixture needs review'
with tempfile.TemporaryDirectory(dir=out,prefix='sdk-') as work:
    sdk=Path(work);sdk.chmod(0o755)
    names=['libxslt','libxslt-dev','libxml2-dev','krb5-libs','krb5-dev','e2fsprogs-dev']
    for n in names:
        p=I['packages']['3.24/'+n]; directory=ROOT/'packages/alpine-3.24'; f=directory/p['file']
        assert sha(f) == p['sha256']
        run(['docker','run','--rm',*LIMITS,'-v',str(directory)+':/packages:ro','--entrypoint','apk',F['compiler'],'verify','/packages/'+p['file']])
        with tarfile.open(f) as t:
            for m in t:
                if m.name.startswith(('usr/include/','usr/lib/')): t.extract(m,sdk,filter='data')
    lib = run(['docker','run','--rm',*LIMITS,'--entrypoint','cat',I['fixtureXmlInput']['image'],'/usr/lib/libxml2.so.2'])
    assert hashlib.sha256(lib).hexdigest() == I['fixtureXmlInput']['sha256']
    (sdk/'usr/lib/libxml2.so.2').write_bytes(lib)
    for p in sdk.rglob('*'):
        if not p.is_symlink(): p.chmod(0o755 if p.is_dir() else 0o644)
    for n,p in sources.items():
        flags = ['-I/sdk/usr/include/libxml2','-l:libexslt.so.0','-l:libxslt.so.1','-l:libxml2.so.2'] if n=='xslt-native' else ['-l:libkrb5.so.3','-l:libk5crypto.so.3','-l:libgssapi_krb5.so.2']
        run(['docker','run','--rm',*LIMITS,'--tmpfs','/tmp:rw,size=32m','-v',str(sdk)+':/sdk:ro','-v',str(out)+':/out:rw','-v',str(p)+':/fixture.c:ro','--entrypoint','cc',F['compiler'],'-O2','-Wall','-Wextra','-Werror','-I/sdk/usr/include','/fixture.c','-L/sdk/usr/lib','-Wl,--allow-shlib-undefined',*flags,'-o','/out/'+n])
        assert sha(out/n) == F['binaries'][n], 'Unexpected fixture bytes; retain for review'
(out/'build.json').write_text(json.dumps(F,indent=2)+'\n')
print('Both pinned native fixtures built without network access')

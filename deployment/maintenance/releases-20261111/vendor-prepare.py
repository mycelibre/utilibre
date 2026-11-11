"""Finite signed Alpine library overlay. Preparation only; no live data mounts.

Reuses the existing full-image exporter and native consumer fixtures. No
dependency resolution, source edits, vulnerability reproduction or deployment.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/vendor-libs-20261111')
INPUTS = json.loads((HERE / 'vendor-inputs.json').read_text())
LIMITS = ['--network', 'none', '--read-only', '--cap-drop', 'ALL',
          '--security-opt', 'no-new-privileges', '--cpus', '1', '--memory', '256m',
          '--memory-swap', '256m', '--pids-limit', '64', '--log-driver', 'none']

def sha(p):
    with Path(p).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def run(args, timeout=240):
    p = subprocess.run(args, capture_output=True, timeout=timeout)
    if p.returncode:
        raise RuntimeError(p.stdout.decode(errors='replace') + p.stderr.decode(errors='replace'))
    return p.stdout

def docker(*args):
    return run(['docker', *args]).decode().strip()

def native(image, command, *args):
    return run(['docker', 'run', '--rm', *LIMITS, '--entrypoint', command, image, *args])

def load_exporter():
    p = HERE.parent / 'security-20261109/zlib-check.py'
    assert sha(p) == INPUTS['fixtureHashes']['security-20261109/zlib-check.py']
    spec = importlib.util.spec_from_file_location('retained_image_scope', p)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

def scope(s, b, out):
    helper = load_exporter()
    before, after = [helper.export_manifest(i) for i in (s['base'], b['imageId'])]
    olddb, newdb = [helper.inventory(native(i, 'cat', '/lib/apk/db/installed')) for i in (s['base'], b['imageId'])]
    names = set(s['packages'])
    assert olddb.keys() == newdb.keys()
    assert {k:v for k,v in olddb.items() if k not in names} == {k:v for k,v in newdb.items() if k not in names}
    payload = set()
    libraries = set()
    for image in (s['base'], b['imageId']):
        for name in names:
            files = native(image, 'apk', '--no-network', 'info', '-L', name).decode().splitlines()[1:]
            assert files
            for p in filter(None, files):
                assert p.startswith(('usr/lib/', 'usr/bin/', 'usr/share/')) and '..' not in p.split('/')
                payload.add(p)
                if before.get(p, {}).get('type') == '0' and '.so.' in p:
                    libraries.add(p)
    allowed = payload | {'lib/apk/db/installed', 'etc/apk/world'}
    changed = {p: {'before':before.get(p), 'after':after.get(p)} for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
    assert changed and set(changed) <= allowed, 'Unexpected image changes: ' + repr(set(changed) - allowed)
    worlds = [native(i, 'cat', '/etc/apk/world').decode().splitlines() for i in (s['base'], b['imageId'])]
    def targeted(v):
        return any(v == n or v.startswith((n+'=', n+'><')) for n in names)
    assert [v for v in worlds[0] if not targeted(v)] == [v for v in worlds[1] if not targeted(v)]
    for world, database in zip(worlds, (olddb, newdb)):
        for n in names:
            f = {l[0]:l[2:] for l in database[n].splitlines() if l.startswith(('V:', 'C:'))}
            assert all(v in (n, n+'='+f['V'], n+'><'+f['C']) for v in world if v == n or v.startswith((n+'=', n+'><')))
    abi = []
    with tempfile.TemporaryDirectory(dir=out) as tmp:
        for p in sorted(libraries):
            values = []
            for index, image in enumerate((s['base'], b['imageId'])):
                f = Path(tmp) / str(index); f.write_bytes(native(image, 'cat', '/'+p))
                symbols = helper.symbols(f)
                dynamic = [l.split(')', 1)[1].strip() for l in run(['readelf', '-d', str(f)]).decode().splitlines() if '(NEEDED)' in l or '(SONAME)' in l]
                values.append((symbols, dynamic))
            assert values[0][0] <= values[1][0], 'Removed exports: '+p
            assert values[0][1] == values[1][1], 'Changed ABI dependencies: '+p
            abi.append({'path':p, 'baselineSymbols':len(values[0][0]), 'preserved':True})
    assert abi and before['lib/ld-musl-x86_64.so.1'] == after['lib/ld-musl-x86_64.so.1']
    proof = {'passed':True, 'base':s['base'], 'imageId':b['imageId'], 'packages':sorted(names),
             'allUnrelatedImageFilesUnchanged':True, 'unrelatedApkRecordsUnchanged':True,
             'muslUnchanged':True, 'abi':abi, 'changed':changed, 'worldBefore':worlds[0], 'worldAfter':worlds[1],
             'scope':'Full content/type/mode/ownership/link comparison except signed selected package files and exact APK database/world entries; mtimes excluded.'}
    (out/'scope.json').write_text(json.dumps(proof, indent=2)+'\n')

def prepare(s):
    out = ROOT/s['key']; out.mkdir(exist_ok=True)
    assert s['approval'] == 'preparation-only'
    assert not (out/'build.json').exists() and not (out/'stage.json').exists(), 'Preserve prior evidence'
    assert shutil.disk_usage(ROOT).free >= INPUTS['minimumFreeBytes']
    for name in s['containers']:
        assert docker('inspect', '--format', '{{.Image}}', name) == s['base']
    assert native(s['base'], 'cat', '/etc/alpine-release').decode().strip() == s['release']
    helper = load_exporter()
    olddb = helper.inventory(native(s['base'], 'cat', '/lib/apk/db/installed'))
    for name, version in s['packages'].items():
        assert '\nV:'+version+'\n' in '\n'+olddb[name]+'\n'
    old = json.loads(docker('image', 'inspect', '--format', '{{json .Config}}', s['base']))
    context = out/'context'; context.mkdir()
    pins = [INPUTS['packages'][s['branch']+'/'+name] for name in s['packages']]
    for p in pins:
        f = ROOT/'packages'/('alpine-'+p['branch'])/p['file']
        assert sha(f) == p['sha256'] and p['branch'] == s['branch']
        shutil.copy2(f, context/p['file']); (context/p['file']).chmod(0o644)
    alias = 'utilibre-vendor-base:'+s['base'][7:19]; docker('tag', s['base'], alias)
    user = old.get('User', ''); assert not user or all(c.isalnum() or c in '_:.-' for c in user)
    df = f'FROM {alias}\nUSER 0\nCOPY *.apk /tmp/utilibre-vendor/\n'
    df += 'RUN set -eu; if [ -f /var/log/apk.log ]; then cp -p /var/log/apk.log /tmp/old-apk.log; fi; apk verify /tmp/utilibre-vendor/*.apk; apk add --no-network /tmp/utilibre-vendor/*.apk; if [ -f /tmp/old-apk.log ]; then cp -p /tmp/old-apk.log /var/log/apk.log; rm /tmp/old-apk.log; else rm -f /var/log/apk.log; fi; rm /tmp/utilibre-vendor/*.apk; rmdir /tmp/utilibre-vendor\n'
    # Preserve the exact image user, including an unspecified root user.
    if user: df += 'USER '+user+'\n'
    else: df = df.replace('USER 0\n', '', 1)
    (context/'Dockerfile').write_text(df)
    result = subprocess.run(['docker','build','--network','none','--pull=false','--force-rm','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s['candidate'],str(context)],capture_output=True,timeout=240,env={**os.environ,'DOCKER_BUILDKIT':'0'})
    (out/'build.log').write_bytes(result.stdout+result.stderr); assert result.returncode == 0, 'Private build log retained'
    image = docker('image','inspect','--format','{{.Id}}',s['candidate'])
    assert json.loads(docker('image','inspect','--format','{{json .Config}}',image)) == old
    fixture = INPUTS['nativeFixture']; native_rows = []
    for im in (s['base'], image):
        results = {}
        for name in ['xslt-native'] + (['kerberos-native'] if 'krb5-libs' in s['packages'] else []):
            f = ROOT/'fixture'/name; assert sha(f) == fixture['binaries'][name]
            value = run(['docker','run','--rm',*LIMITS,'--user','65534:65534','--tmpfs','/tmp:rw,size=8m','-v',str(f)+':/native:ro','--entrypoint','/native',im]).decode().strip()
            assert value == ('KERBEROS_NATIVE_PASSED checks=15' if name.startswith('kerberos') else 'XSLT_NATIVE_PASSED parse-transform-sort-parameter-utf8-serialize')
            results[name] = value
        native_rows.append({'imageId':im,'passed':True,'results':results})
    b = {**s,'date':datetime.now(timezone.utc).isoformat(),'imageId':image,'pins':pins,'configurationUnchanged':True,'unrelatedPackagesUnchanged':True,'nativeRows':native_rows,'nativeFixture':fixture}
    (out/'stage.json').write_text(json.dumps(b,indent=2)+'\n')
    scope(s,b,out)
    b.update(passed=True,applicationBytesUnchanged=True,scopeSha256=sha(out/'scope.json'),releaseAuthorized=False)
    (out/'build.json').write_text(json.dumps(b,indent=2)+'\n')
    print(s['key']+': signed vendor overlay, native API and exact image scope passed',flush=True)

if __name__ == '__main__':
    assert sys.argv[1:] and len(set(sys.argv[1:])) == len(sys.argv[1:])
    for key in sys.argv[1:]:
        s = next(r for r in INPUTS['rows'] if r['key'] == key)
        try: prepare(s)
        except Exception:
            import traceback
            (ROOT/key/'error.log').write_text(traceback.format_exc())
            raise

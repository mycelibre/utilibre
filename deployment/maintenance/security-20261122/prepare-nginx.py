"""Finite signed vendor overlays, using the retained full-image comparison.

No live mounts, application edits, dependency solving, network, or deployment.
An unexpected file/package/script change fails closed for maintainer review.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import io
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
INPUTS = json.loads((HERE/'nginx-inputs.json').read_text())


def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


exporter = HERE.parent/'security-20261109/zlib-check.py'
assert sha(exporter) == INPUTS['exporterSha256']
spec = importlib.util.spec_from_file_location('retained_image_scope', exporter)
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)
LIMITS = helper.LIMITS


def run(args, timeout=240):
    return helper.run(args, timeout)


def native(image, *args):
    return run(['docker', 'run', '--rm', *LIMITS, '--user', '0', '--entrypoint', args[0], image, *args[1:]])


def docker(*args):
    return run(['docker', *args]).decode().strip()


def scripts(image, path, versions):
    blob = native(image, 'cat', '/'+path)
    with tarfile.open(fileobj=io.BytesIO(blob)) as archive:
        rows = {}
        for m in archive:
            if not m.isfile():
                continue
            name = m.name
            for package, version in versions.items():
                name = re.sub(r'^'+re.escape(package+'-'+version)+r'\.[^.]+\.', package+'.', name)
            assert name not in rows
            rows[name] = hashlib.sha256(archive.extractfile(m).read()).hexdigest()
        return rows


def scope(s, image, out):
    manifests = [helper.export_manifest(i) for i in (s['base'], image)]
    before, after = manifests
    databases = [helper.inventory(native(i, 'cat', '/lib/apk/db/installed')) for i in (s['base'], image)]
    olddb, newdb = databases
    names = set(s['packages'])
    assert olddb.keys() == newdb.keys()
    assert {n:v for n,v in olddb.items() if n not in names} == {n:v for n,v in newdb.items() if n not in names}
    for n in names:
        assert '\nV:'+INPUTS['packages'][n]['version']+'\n' in '\n'+newdb[n]+'\n'
    payload = set()
    for im in (s['base'], image):
        # Fixed reviewed package names, no arbitrary shell input.
        assert all(re.fullmatch(r'[a-z0-9-]+', n) for n in names)
        text = native(im, 'sh', '-ec', 'for p in '+ ' '.join(sorted(names))+'; do apk --no-network info -L "$p"; done').decode()
        payload.update(p for p in text.splitlines() if p and not p.endswith(' contains:'))
    for p in payload:
        assert not p.startswith('/') and '..' not in p.split('/')
    allowed = payload | {'lib/apk/db/installed', 'etc/apk/world'}
    for p in ('lib/apk/db/scripts.tar', 'lib/apk/db/scripts.tar.gz'):
        if before.get(p) != after.get(p):
            assert scripts(s['base'], p, s['packages']) == scripts(image, p, {n:INPUTS['packages'][n]['version'] for n in names}), 'Package script body changed'
            allowed.add(p)
    changed = {p:{'before':before.get(p), 'after':after.get(p)} for p in sorted(before.keys() | after.keys()) if before.get(p) != after.get(p)}
    (out/'changes.json').write_text(json.dumps(changed, indent=2)+'\n')
    assert changed and set(changed) <= allowed, 'Unexpected image changes: '+repr(set(changed)-allowed)
    assert all(before[p] == after.get(p) for p in before if p.startswith('etc/') and p != 'etc/apk/world'), 'Existing configuration changed'
    assert before['lib/ld-musl-x86_64.so.1'] == after['lib/ld-musl-x86_64.so.1']
    worlds = [native(i, 'cat', '/etc/apk/world').decode().splitlines() for i in (s['base'], image)]
    targeted = lambda v:any(v == n or v.startswith((n+'=', n+'><')) for n in names)
    assert [v for v in worlds[0] if not targeted(v)] == [v for v in worlds[1] if not targeted(v)]
    for world, database in zip(worlds, databases):
        for n in names:
            f = {l[0]:l[2:] for l in database[n].splitlines() if l.startswith(('V:', 'C:'))}
            assert all(v in (n, n+'='+f['V'], n+'><'+f['C']) for v in world if v == n or v.startswith((n+'=', n+'><')))
    result = {'passed':True, 'base':s['base'], 'imageId':image, 'allUnrelatedImageFilesUnchanged':True,
              'configurationUnchanged':True, 'muslUnchanged':True, 'unrelatedApkRecordsUnchanged':True,
              'packageScriptsUnchanged':True, 'changedCount':len(changed), 'changesSha256':sha(out/'changes.json'),
              'scope':'Full content/type/mode/ownership/link comparison; timestamps excluded.'}
    (out/'scope.json').write_text(json.dumps(result, indent=2)+'\n')


def prepare(s):
    out = ROOT/'nginx'/s['key']; out.mkdir(parents=True, exist_ok=True)
    assert s['approval'] == 'preparation-only'
    assert not (out/'build.json').exists(), 'Preserve completed evidence'
    assert shutil.disk_usage(ROOT).free >= INPUTS['minimumFreeBytes']
    for name in s['containers']:
        assert docker('inspect', '--format', '{{.Image}}', name) == s['base']
    assert native(s['base'], 'cat', '/etc/alpine-release').decode().strip() == s['release']
    olddb = helper.inventory(native(s['base'], 'cat', '/lib/apk/db/installed'))
    for n,v in s['packages'].items():
        assert '\nV:'+v+'\n' in '\n'+olddb[n]+'\n'
    oldconfig = json.loads(docker('image', 'inspect', '--format', '{{json .Config}}', s['base']))
    context = out/'context'; context.mkdir(exist_ok=True)
    for n in s['packages']:
        p=INPUTS['packages'][n]; f=ROOT/'packages'/p['file']
        assert sha(f) == p['sha256']; shutil.copy2(f,context/p['file']); (context/p['file']).chmod(0o644)
    alias='utilibre-vendor-base:'+s['base'][7:19]; docker('tag',s['base'],alias)
    user=oldconfig.get('User',''); assert re.fullmatch(r'[a-zA-Z0-9_:.-]*',user)
    recipe = f'FROM {alias}\n'+('USER 0\n' if user else '')+'COPY *.apk /usr/lib/utilibre-vendor/\n'
    recipe += '''RUN set -eu; mkdir /usr/lib/utilibre-vendor/html; \\
 for f in index.html 50x.html; do if test -f /usr/share/nginx/html/$f; then cp -p /usr/share/nginx/html/$f /usr/lib/utilibre-vendor/html/$f; fi; done; \\
 if test -f /var/log/apk.log; then cp -p /var/log/apk.log /usr/lib/utilibre-vendor/old-apk.log; fi; \\
 apk verify /usr/lib/utilibre-vendor/*.apk; apk add --no-network /usr/lib/utilibre-vendor/*.apk; \\
 for f in index.html 50x.html; do if test -f /usr/lib/utilibre-vendor/html/$f; then cp -p /usr/lib/utilibre-vendor/html/$f /usr/share/nginx/html/$f; else rm -f /usr/share/nginx/html/$f; fi; done; \\
 if test -f /usr/lib/utilibre-vendor/old-apk.log; then cp -p /usr/lib/utilibre-vendor/old-apk.log /var/log/apk.log; else rm -f /var/log/apk.log; fi; \\
 rm -r /usr/lib/utilibre-vendor
'''
    if user: recipe += 'USER '+user+'\n'
    (context/'Dockerfile').write_text(recipe)
    p=subprocess.run(['docker','build','--network','none','--pull=false','--force-rm','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s['candidate'],str(context)],capture_output=True,timeout=240,env={**os.environ,'DOCKER_BUILDKIT':'0'})
    (out/'build.log').write_bytes(p.stdout+p.stderr); assert p.returncode==0, 'Private build log retained'
    image=docker('image','inspect','--format','{{.Id}}',s['candidate'])
    assert json.loads(docker('image','inspect','--format','{{json .Config}}',image))==oldconfig
    scope(s,image,out)
    checks=[]
    for im in (s['base'],image):
        version=native(im,'nginx','-v').decode().strip()  # nginx prints version on stderr; checked below too.
        info=native(im,'sh','-ec','nginx -v 2>&1; nginx -V 2>&1').decode()
        assert 'nginx/1.30.' in info
        for n,f in INPUTS['fixtures'].items():
            if n not in s['packages']: continue
            assert sha(f['path'])==f['sha256']
            value=run(['docker','run','--rm',*LIMITS,'--user','65534:65534','--tmpfs','/tmp:rw,size=8m','-v',f['path']+':/native:ro','--entrypoint','/native',im]).decode().strip()
            assert 'PASSED' in value
            checks.append({'imageId':im,'fixture':n,'output':value})
    result={**s,'passed':True,'date':datetime.now(timezone.utc).isoformat(),'imageId':image,
            'configurationUnchanged':True,'unrelatedPackagesUnchanged':True,'native':checks,
            'scopeSha256':sha(out/'scope.json'),'dockerfileSha256':sha(context/'Dockerfile'),
            'network':'none','deployed':False}
    (out/'build.json').write_text(json.dumps(result,indent=2)+'\n')
    print(s['key']+': signed update and complete image scope passed',flush=True)


if __name__ == '__main__':
    assert sys.argv[1:] and len(set(sys.argv[1:]))==len(sys.argv[1:])
    for key in sys.argv[1:]:
        row=next(s for s in INPUTS['rows'] if s['key']==key)
        try: prepare(row)
        except Exception:
            import traceback
            (ROOT/'nginx'/key/'error.log').write_text(traceback.format_exc())
            raise

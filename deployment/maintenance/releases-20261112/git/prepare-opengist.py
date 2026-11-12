"""Exact signed Git-only Alpine overlay, using the existing image exporter.

Preparation only. No production files, credentials or namespaces are mounted.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone

os.umask(0o077)
HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
ROOT = Path('/var/lib/utilibre-maintenance/git-vendor-20261112')
INPUTS = json.loads((HERE/'inputs.json').read_text())
SPEC = INPUTS['opengist']
LIMITS = ['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
          '--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none']


def sha(path):
    with Path(path).open('rb') as file:
        return hashlib.file_digest(file, 'sha256').hexdigest()


def run(args, timeout=240):
    result = subprocess.run(args,capture_output=True,timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stdout.decode(errors='replace') + result.stderr.decode(errors='replace'))
    return result.stdout


def docker(*args):
    return run(['docker',*args]).decode().strip()


def native(image, command, *args):
    return run(['docker','run','--rm',*LIMITS,'--user','0','--entrypoint',command,image,*args])


assert SPEC['approval'] == 'preparation-only'
assert shutil.disk_usage(ROOT).free >= 8*1024**3
assert docker('inspect','--format','{{.Image}}',SPEC['container']) == SPEC['base']
exporter = REPO/'deployment/maintenance/security-20261109/zlib-check.py'
assert sha(exporter) == INPUTS['exporterSha256']
module = importlib.util.spec_from_file_location('retained_image_scope',exporter)
helper = importlib.util.module_from_spec(module)
module.loader.exec_module(helper)
assert native(SPEC['base'],'cat','/etc/alpine-release').decode().strip() == '3.24.1'
out = ROOT/'opengist'
out.mkdir(exist_ok=True)
assert not (out/'build.json').exists(), 'Preserve existing successful evidence'
context = out/'context'
context.mkdir(exist_ok=True)
before_db = helper.inventory(native(SPEC['base'],'cat','/lib/apk/db/installed'))
for package in INPUTS['packages']:
    assert '\nV:2.54.0-r0\n' in '\n'+before_db[package['name']]+'\n'
    source = ROOT/'packages'/package['file']
    assert sha(source) == package['sha256']
    shutil.copy2(source,context/package['file'])
    (context/package['file']).chmod(0o644)
old_config = json.loads(docker('image','inspect','--format','{{json .Config}}',SPEC['base']))
user = old_config.get('User','')
assert not user or all(c.isalnum() or c in '_:.-' for c in user)
alias = 'utilibre-git-base:'+SPEC['base'][7:19]
docker('tag',SPEC['base'],alias)
recipe = f'FROM {alias}\n' + ('USER 0\n' if user else '') + 'COPY *.apk /tmp/utilibre-vendor/\n'
recipe += 'RUN set -eu; if [ -f /var/log/apk.log ]; then cp -p /var/log/apk.log /tmp/old-apk.log; fi; apk verify /tmp/utilibre-vendor/*.apk; apk add --no-network /tmp/utilibre-vendor/*.apk; if [ -f /tmp/old-apk.log ]; then cp -p /tmp/old-apk.log /var/log/apk.log; rm /tmp/old-apk.log; else rm -f /var/log/apk.log; fi; rm /tmp/utilibre-vendor/*.apk; rmdir /tmp/utilibre-vendor\n'
if user:
    recipe += 'USER '+user+'\n'
(context/'Dockerfile').write_text(recipe)
build = subprocess.run(['docker','build','--network','none','--pull=false','--force-rm',
    '--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',SPEC['candidate'],str(context)],
    capture_output=True,timeout=240,env={**os.environ,'DOCKER_BUILDKIT':'0'})
(out/'build.log').write_bytes(build.stdout+build.stderr)
assert build.returncode == 0, 'Private build log retained'
image = docker('image','inspect','--format','{{.Id}}',SPEC['candidate'])
assert json.loads(docker('image','inspect','--format','{{json .Config}}',image)) == old_config
after_db = helper.inventory(native(image,'cat','/lib/apk/db/installed'))
names = {p['name'] for p in INPUTS['packages']}
assert before_db.keys() == after_db.keys()
assert {k:v for k,v in before_db.items() if k not in names} == {k:v for k,v in after_db.items() if k not in names}
for name in names:
    assert '\nV:2.54.1-r0\n' in '\n'+after_db[name]+'\n'
before,after = [helper.export_manifest(i) for i in (SPEC['base'],image)]
allowed = {'lib/apk/db/installed','etc/apk/world'}
for identifier in (SPEC['base'],image):
    for name in names:
        files = native(identifier,'apk','--no-network','info','-L',name).decode().splitlines()[1:]
        assert files
        for path in filter(None,files):
            assert path.startswith(('usr/bin/','usr/lib/','usr/libexec/','usr/share/')) and '..' not in path.split('/')
            allowed.add(path)
changed = {path:{'before':before.get(path),'after':after.get(path)} for path in sorted(before.keys()|after.keys()) if before.get(path)!=after.get(path)}
assert changed and set(changed) <= allowed, 'Unexpected image changes: '+repr(set(changed)-allowed)
assert before['lib/ld-musl-x86_64.so.1'] == after['lib/ld-musl-x86_64.so.1']
worlds = [native(i,'cat','/etc/apk/world').decode().splitlines() for i in (SPEC['base'],image)]
targeted = lambda value:any(value==n or value.startswith((n+'=',n+'><')) for n in names)
assert [v for v in worlds[0] if not targeted(v)] == [v for v in worlds[1] if not targeted(v)]
fixture = HERE/'native-git.sh'
assert sha(fixture) == INPUTS['nativeFixtureSha256']
checks = []
for identifier in (SPEC['base'],image):
    output = run(['docker','run','--rm',*LIMITS,'--user','65534:65534',
        '--tmpfs','/tmp:rw,size=64m,mode=1777','-v',str(fixture)+':/fixture.sh:ro',
        '--entrypoint','sh',identifier,'/fixture.sh']).decode().strip()
    assert output.endswith('GIT_NATIVE_COMPATIBILITY_PASSED')
    checks.append({'imageId':identifier,'passed':True,'gitVersion':native(identifier,'git','--version').decode().strip()})
(out/'scope.json').write_text(json.dumps({'passed':True,'base':SPEC['base'],'imageId':image,
    'allUnrelatedFilesUnchanged':True,'unrelatedApkRecordsUnchanged':True,'configurationUnchanged':True,
    'muslUnchanged':True,'changed':changed,'worldBefore':worlds[0],'worldAfter':worlds[1],
    'comparison':'Content/type/mode/ownership/link identity; timestamps excluded.'},indent=2)+'\n')
(out/'build.json').write_text(json.dumps({'passed':True,'date':datetime.now(timezone.utc).isoformat(),
    'base':SPEC['base'],'imageId':image,'candidate':SPEC['candidate'],'packages':INPUTS['packages'],
    'nativeChecks':checks,'configurationUnchanged':True,'unrelatedFilesUnchanged':True,
    'builderSha256':sha(Path(__file__)),'nativeFixtureSha256':sha(fixture),'network':'none',
    'productionChanged':False,'deployed':False},indent=2)+'\n')
print('Signed Git overlay and ordinary compatibility checks passed: '+image)

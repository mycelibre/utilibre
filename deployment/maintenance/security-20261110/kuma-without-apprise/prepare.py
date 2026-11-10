#!/usr/bin/env python3
"""Finite offline package removal. Reuse the existing image inventory, no deployment."""
import ast, datetime, hashlib, json, os, pathlib, shutil, subprocess, sys, tarfile
HERE = pathlib.Path(__file__).resolve().parent
OUT = pathlib.Path('/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise')
SPEC = json.loads((HERE/'inputs.json').read_text())
os.umask(0o077)
# Import only reviewed pure helpers: that historical adapter has a live main loop.
tree = ast.parse((HERE.parent.parent/'runtime-gnutls-minimization/stage.py').read_text())
helpers = [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in ['run','inspect','isolated','packages','manifest']]
assert len(helpers) == 5
exec(compile(ast.Module(body=helpers, type_ignores=[]), '<existing image inventory>', 'exec'))
def write(name, value):
    (OUT/name).write_text(json.dumps(value, indent=2, sort_keys=True)+'\n')
def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()
def verify(base, candidate):
    before, after = inspect(base), inspect(candidate)
    assert before['Id'] == SPEC['base'], 'Unsupported baseline'
    old_config, new_config = dict(before['Config']), dict(after['Config'])
    old_config.pop('Image', None); new_config.pop('Image', None)
    assert old_config == new_config, 'Image runtime configuration changed'
    old_packages, new_packages = packages(base), packages(candidate)
    for name, version in SPEC['packages'].items(): assert old_packages[name][0] == version
    assert sorted(old_packages.keys()-new_packages.keys()) == sorted(SPEC['packages'])
    assert all(old_packages.get(p) == row for p, row in new_packages.items())
    assert isolated(candidate, ['dpkg','--audit']) == ''
    old, new = manifest(base), manifest(candidate)
    write('filesystem-before.json', old); write('filesystem-after.json', new)
    owned = set(isolated(base, ['dpkg-query','-L',*SPEC['packages']]).splitlines())
    metadata = {'/var/lib/dpkg/status','/var/lib/dpkg/status-old','/var/log/dpkg.log','/var/lib/dpkg/triggers/Unincorp'}
    def permitted(p):
        if p in metadata: return True
        if p in owned or any(p.startswith('/var/lib/dpkg/info/'+n+'.') for n in SPEC['packages']):
            return p not in new or old.get(p,{}).get('type') == '5' and new[p] == old[p]
        return p not in new and any(p.startswith('/usr/lib/python3/dist-packages/'+n+'/') for n in ['apprise','markdown']) and ('/__pycache__/' in p or p.endswith('/__pycache__'))
    changed = sorted(p for p in old.keys()|new.keys() if old.get(p) != new.get(p))
    unexpected = [p for p in changed if not permitted(p)]
    write('changed-paths.json', {'changed':changed,'unexpected':unexpected})
    assert not unexpected, unexpected
    assert not any(p.startswith(('/usr/lib/python3/dist-packages/markdown/','/usr/lib/python3/dist-packages/apprise/')) for p in new)
    assert '/usr/bin/apprise' not in new
    return {'passed':True,'base':base,'imageId':after['Id'],'candidate':SPEC['candidate'],
            'date':datetime.datetime.now(datetime.timezone.utc).isoformat(),'removedPackages':sorted(SPEC['packages']),
            'unchangedPackages':len(new_packages),'unchangedPaths':len(new.keys()&old.keys())-sum(p in new and p in old for p in changed),
            'changedPaths':changed,'configurationUnchanged':True,'recipeHashes':{p.name:sha(p) for p in [HERE/'inputs.json',HERE/'Dockerfile',HERE/'prepare.py']}}
if __name__ == '__main__':
    assert sys.argv[1:] in [[],['verify']]
    assert shutil.disk_usage(OUT.parent).free > 8*1024**3
    OUT.mkdir(mode=0o700, parents=True, exist_ok=True)
    if sys.argv[1:] == ['verify']:
        previous=json.loads((OUT/'build.json').read_text())
        assert inspect(SPEC['candidate'])['Id'] == previous['imageId']
        result=verify(SPEC['base'],previous['imageId'])
        assert result['recipeHashes'] == previous['recipeHashes']
        write('repeat.json',result)
    else:
        assert not (OUT/'build.json').exists(), 'Completed candidate already exists; use verify'
        assert inspect(SPEC['baseTag'])['Id'] == SPEC['base']
        with (OUT/'build.log').open('w') as log:
            subprocess.run(['docker','build','--pull=false','--network=none','--memory=1g','--cpuset-cpus='+str(min(os.sched_getaffinity(0))),'-t',SPEC['candidate'],'-f',str(HERE/'Dockerfile'),str(HERE)],env={**os.environ,'DOCKER_BUILDKIT':'0'},stdout=log,stderr=log,timeout=180,check=True)
        write('build.json',verify(SPEC['base'],SPEC['candidate']))
    print('Exact package removal, complete filesystem scope and image configuration passed.')

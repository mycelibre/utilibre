#!/usr/bin/env python3
"""Reproduce the source-only repair over the exact retained security runtime.

Usage: build.py NEW_PRIVATE_DIRECTORY [CANDIDATE_TAG]
Builds a candidate only. Does not change running services or production data.
"""
import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import urllib.request

BASE = 'sha256:d39a6b372274f39f4ef42af4d865451106534516c728d4d8a5499d60a1e6b157'
LOCAL_VERSION = '1.0.0+utilibre.search.20261109'
RECIPE = Path(__file__).resolve().parent

def run(*args, **kw):
    return subprocess.run(args, check=True, **kw)

def inspect(ref):
    return json.loads(subprocess.check_output(['docker', 'image', 'inspect', ref]))[0]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def download(url):
    with urllib.request.urlopen(url, timeout=30) as response:
        data = response.read(5_000_001)
    if len(data) > 5_000_000:
        raise ValueError('Unexpected pinned input size')
    return data

def main():
    if len(sys.argv) not in (2, 3):
        raise SystemExit(__doc__)
    stage = Path(sys.argv[1]).resolve()
    stage.mkdir(mode=0o700)  # Never overwrite an earlier build.
    tag = sys.argv[2] if len(sys.argv) == 3 else 'utilibre-degoog:1.0.0-search-20261109-p2'
    before = inspect(BASE)
    source = stage / 'source'; source.mkdir()
    cid = subprocess.check_output(['docker', 'create', '--network', 'none', BASE], text=True).strip()
    try:
        for name in ('src', 'package.json', 'tsconfig.json'):
            run('docker', 'cp', cid + ':/app/' + name, str(source / name), stdout=subprocess.DEVNULL)
    finally:
        run('docker', 'rm', cid, stdout=subprocess.DEVNULL)
    run('git', '-C', str(source), 'apply', '--check', str(RECIPE / 'bridge-and-status.patch'))
    run('git', '-C', str(source), 'apply', str(RECIPE / 'bridge-and-status.patch'))
    package = json.loads((source / 'package.json').read_text())
    assert package['version'] == '1.0.0'
    assert package['dependencies']['dompurify'] == '3.4.16'
    package['version'] = LOCAL_VERSION  # Native asset URLs must invalidate old caches.
    package['dependencies']['dompurify'] = '3.4.17'  # Already installed in BASE.
    (source / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
    (source / 'node_modules').symlink_to('/app/node_modules')
    for entry in json.loads((RECIPE / 'build-toolchain.json').read_text()):
        data = download(entry['url'])
        assert sha(data) == entry['sha256']
        assert 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode() == entry['integrity']
        archive = stage / (entry['name'].replace('/', '-') + '.tgz'); archive.write_bytes(data)
        target = stage / 'build-tools/node_modules' / entry['name']; target.mkdir(parents=True)
        with tarfile.open(archive) as tf:
            for member in tf.getmembers():
                assert member.name.startswith('package/') and '..' not in Path(member.name).parts
                member.name = member.name[len('package/'):]
                if member.name: tf.extract(member, target, filter='data')
    build = '''import {build,version} from '/build-tools/node_modules/esbuild/lib/main.js';
import DOMPurify from '/app/node_modules/dompurify/dist/purify.es.mjs';
if(version!=='0.28.1'||DOMPurify.version!=='3.4.17')throw Error('Unexpected security toolchain');
await build({absWorkingDir:'/work',entryPoints:['src/client/app.ts'],bundle:true,outfile:'src/public/app.js',format:'esm',target:['es2022'],minify:true,sourcemap:false,define:{'process.env.LOG_LEVEL':JSON.stringify('error')}});
'''
    (source / 'repair-build.mjs').write_text(build)
    run('docker', 'run', '--rm', '--network', 'none', '--read-only', '--user', '0', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '1g', '--cpus', '2', '--tmpfs', '/tmp:rw,noexec,nosuid,size=32m', '-v', str(source) + ':/work', '-v', str(stage / 'build-tools') + ':/build-tools:ro', '--entrypoint', 'bun', BASE, '/work/repair-build.mjs')
    changed = [line[6:] for line in (RECIPE / 'bridge-and-status.patch').read_text().splitlines() if line.startswith('+++ b/')]
    changed.append('src/public/app.js')
    changed.append('package.json')
    hashes = {}
    for name in changed:
        dst = stage / 'overlay' / name; dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / name, dst); hashes[name] = sha(dst.read_bytes())
    engine = json.loads((RECIPE / 'engine-source.json').read_text())
    target = stage / 'engines'; target.mkdir()
    prefix = 'https://raw.githubusercontent.com/searxng/searxng/' + engine['revision']
    brave = download(prefix + '/searx/engines/brave.py')
    traits_source = download(prefix + '/searx/data/engine_traits.json')
    assert sha(traits_source) == engine['traitsSourceSha256']
    traits = (json.dumps(json.loads(traits_source)['brave']) + '\n').encode()
    for name, data in [('brave.py', brave), ('brave.traits.json', traits)]:
        assert sha(data) == engine['files'][name]; (target / name).write_bytes(data)
    (stage / 'Dockerfile').write_text('FROM ' + BASE + '\nCOPY overlay/ /app/\n')
    run('docker', 'build', '--network', 'none', '--pull=false', '-t', tag, str(stage), env={**os.environ, 'DOCKER_BUILDKIT': '0'})
    after = inspect(tag)
    assert before['Config'] == after['Config']
    assert after['RootFS']['Layers'][:len(before['RootFS']['Layers'])] == before['RootFS']['Layers']
    receipt = {'passed': True, 'base': BASE, 'candidate': tag, 'localVersion': LOCAL_VERSION, 'imageId': after['Id'], 'sourceHashes': hashes, 'engineSource': engine, 'configurationUnchanged': True, 'baseLayersPreserved': True}
    (stage / 'build.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'candidate': tag, 'imageId': after['Id']}))

if __name__ == '__main__':
    main()

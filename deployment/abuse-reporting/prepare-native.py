#!/usr/bin/env python3
"""Prepare image overlays from installed templates; never build, deploy or write mounts.

Usage: python3 prepare-native.py /absolute/empty/staging/directory
Only public code/templates are read. No account, content or environment is exported.
"""
import difflib
import hashlib
import json
from pathlib import Path
import subprocess
import sys

def digest(content):
    return hashlib.sha256(content).hexdigest()


def main():
    out = Path(sys.argv[1]).resolve()
    assert out.is_absolute() and not out.exists(), 'Use a new staging directory'
    assert not str(out).startswith(('/opt/utilibre/', '/home/ubuntu/freetools/deployment/')), 'Do not stage in runtime paths'
    out.mkdir(parents=True, mode=0o700)
    recipe = Path(__file__).resolve().parent
    inputs = json.loads((recipe / 'inputs.json').read_text())
    assert inputs['version'] == 1
    services = inputs['services']
    records = []
    for expected in services:
        service, container = expected['service'], expected['container']
        # Select fields only; never persist container env or secrets.
        info = json.loads(subprocess.check_output(['docker', 'inspect', container], text=True))[0]
        folder = out / service
        folder.mkdir()
        base_tag = f"utilibre-abuse-base-{service}:{info['Image'][7:19]}"
        record = {'service': service, 'container': container, 'image': info['Image'], 'tag': info['Config']['Image'], 'buildBase': base_tag, 'files': []}
        # Build step must tag the captured immutable local image ID with this
        # alias first; Docker otherwise parses FROM sha256:... as a registry tag.
        dockerfile = f"FROM {base_tag}\n"
        for approved in expected['files']:
            target, name = approved['target'], approved['file']
            before = subprocess.check_output(['docker', 'exec', container, 'cat', target])
            before_hash = digest(before)
            assert before_hash in [approved['beforeSha256'], approved['afterSha256']], f'Unknown template source: {service} {target}'
            patch = recipe / approved['patch']
            assert digest(patch.read_bytes()) == approved['patchSha256'], f'Changed approved patch: {patch.name}'
            candidate = folder / name
            candidate.write_bytes(before)
            if before_hash == approved['beforeSha256']:
                subprocess.run(['patch', '--batch', '--fuzz=0', str(candidate), str(patch)], check=True, capture_output=True)
            after = candidate.read_bytes()
            assert digest(after) == approved['afterSha256'], f'Unexpected patched template: {service} {target}'
            (folder / (name + '.patch')).write_text(''.join(difflib.unified_diff(before.decode().splitlines(True), after.decode().splitlines(True), fromfile='a' + target, tofile='b' + target)))
            mounted = any(target == m['Destination'] or target.startswith(m['Destination'].rstrip('/') + '/') for m in info['Mounts'])
            record['files'].append({'target': target, 'file': name, 'beforeSha256': digest(before), 'afterSha256': digest(after), 'mounted': mounted})
            if not mounted:
                dockerfile += f'COPY --chmod=644 {name} {target}\n'
        (folder / 'Dockerfile').write_text(dockerfile)
        records.append(record)
    (out / 'manifest.json').write_text(json.dumps(records, indent=2) + '\n')
    print(json.dumps({'staging': str(out), 'services': [r['service'] for r in records], 'deployed': False}))


if __name__ == '__main__':
    main()

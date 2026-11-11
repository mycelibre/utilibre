#!/usr/bin/env python3
"""Compare stopped, isolated image exports; never execute an app or mount data."""
import hashlib
import json
import re
import subprocess
import sys
import tarfile
from pathlib import Path

BASE = 'sha256:2c135f176fb9abd3a0ae4392cf3c9e846d4e3e3d9c49e8ff52e9c2dc22c46ee9'
candidate, output = sys.argv[1:]
assert re.fullmatch(r'sha256:[a-f0-9]{64}', candidate)


def inspect(image):
    value = json.loads(subprocess.check_output(['docker', 'image', 'inspect', image]))[0]
    assert value['Id'] == image
    assert not value['Config'].get('Volumes'), 'No anonymous data volumes permitted'
    return value['Config']


def tree(image):
    container = subprocess.check_output([
        'docker', 'create', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges', '--log-driver', 'none',
        '--entrypoint', '/bin/true', image,
    ], text=True).strip()
    process = None
    try:
        process = subprocess.Popen(['docker', 'export', container], stdout=subprocess.PIPE)
        rows = {}
        with tarfile.open(fileobj=process.stdout, mode='r|') as archive:
            for entry in archive:
                name = entry.name.removeprefix('./').rstrip('/')
                if name in ('etc/hostname', 'etc/hosts', 'etc/resolv.conf', '.dockerenv'):
                    continue
                if name == 'usr/share/nginx/html' or name.startswith('usr/share/nginx/html/'):
                    continue
                digest = None
                if entry.isfile():
                    with archive.extractfile(entry) as stream:
                        digest = hashlib.file_digest(stream, 'sha256').hexdigest()
                rows[name] = [entry.type.decode('ascii'), entry.mode, entry.uid, entry.gid, entry.linkname, digest]
        assert process.wait(timeout=60) == 0
        return rows
    finally:
        if process and process.poll() is None:
            process.kill()
            process.wait()
        subprocess.run(['docker', 'rm', container], check=True, stdout=subprocess.DEVNULL)


before_config, after_config = inspect(BASE), inspect(candidate)
assert before_config == after_config, 'Image configuration drift'
before, after = tree(BASE), tree(candidate)
changed = sorted(name for name in before.keys() | after.keys() if before.get(name) != after.get(name))
report = dict(base=BASE, candidate=candidate, passed=not changed, changedOutsideApplication=changed,
              comparedPaths=len(before), configurationUnchanged=True,
              runtimeSha256=hashlib.sha256(json.dumps(before, sort_keys=True).encode()).hexdigest(),
              scope='Stopped image exports; only static web application may change; no production access')
Path(output).write_text(json.dumps(report, indent=2) + '\n')
assert not changed, 'Unexpected runtime changes; inspect the private report'
print(f'Unchanged runtime: {len(before)} paths and exact image configuration')

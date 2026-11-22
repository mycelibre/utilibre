"""Restore the one unrelated dpkg Priority field changed by apt-mark.

This only prepares a replacement candidate. The complete file-scope verifier
and all runtime checks still run against the original production baseline.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/openssl-fips-runtime')
OUT = ROOT / 'vendor-debian/identity-server'
EXPECTED = 'sha256:eb639e72b9f97b06328fe77c4794dfedd1115240fdee764c44071b41670e21f0'
SELECTED = {'libssl-dev', 'libssl3t64', 'openssl', 'openssl-provider-legacy'}


def restore(before, after):
    def records(blob):
        result = {}
        for paragraph in blob.split(b'\n\n'):
            if not paragraph.strip():
                continue
            names = [line[9:] for line in paragraph.splitlines() if line.startswith(b'Package: ')]
            assert len(names) == 1 and names[0] not in result
            result[names[0]] = paragraph
        return result
    a, b = records(before), records(after)
    assert a.keys() == b.keys()
    changed = {n.decode() for n in a if a[n] != b[n]}
    assert changed == SELECTED | {'zlib1g'}
    old, new = a[b'zlib1g'], b[b'zlib1g']
    assert old.count(b'\nPriority: required\n') == 1
    assert old.replace(b'\nPriority: required\n', b'\nPriority: optional\n') == new
    assert after.count(new) == 1
    return after.replace(new, old)


def main():
    build = json.loads((OUT / 'build.json').read_text())
    assert build['imageId'] == EXPECTED and not build['deployed']
    assert not (OUT / 'build-before-bookkeeping.json').exists()
    assert not any((OUT / f).exists() for f in ('scope.json', 'fips-native.json', 'scan-gate.json'))
    limits = ['--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
              '--security-opt', 'no-new-privileges', '--memory', '128m', '--pids-limit', '32']
    def read_status(image):
        return subprocess.check_output(['docker', 'run', *limits, '--entrypoint', 'cat',
                                        image, '/var/lib/dpkg/status'], timeout=30)
    original, candidate = map(read_status, [build['base'], EXPECTED])
    corrected = restore(original, candidate)
    with tempfile.TemporaryDirectory(prefix='dpkg-bookkeeping-', dir=ROOT) as tmp:
        work = Path(tmp)
        (work / 'status').write_bytes(corrected)
        (work / 'status').chmod(0o644)
        (work / 'Dockerfile').write_text('FROM ' + EXPECTED + '\nCOPY status /var/lib/dpkg/status\n')
        with (OUT / 'bookkeeping-build.log').open('wb') as log:
            subprocess.run(['docker', 'build', '--network', 'none', '--pull=false', '-t',
                            build['candidate'], str(work)], check=True, timeout=120,
                           stdout=log, stderr=subprocess.STDOUT, env={**os.environ, 'DOCKER_BUILDKIT': '0'})
    def inspect(image, field):
        return subprocess.check_output(['docker', 'image', 'inspect', '--format', field, image], timeout=15)
    image = inspect(build['candidate'], '{{.Id}}').decode().strip()
    assert inspect(image, '{{json .Config}}') == inspect(EXPECTED, '{{json .Config}}')
    assert read_status(image) == corrected
    (OUT / 'build-before-bookkeeping.json').write_bytes((OUT / 'build.json').read_bytes())
    build.update(imageId=image, priorCandidate=EXPECTED,
                 bookkeeping={'package': 'zlib1g', 'field': 'Priority', 'restored': 'required',
                              'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                              'beforeSha256': hashlib.sha256(candidate).hexdigest(),
                              'afterSha256': hashlib.sha256(corrected).hexdigest()},
                 limitation='Candidate only; inherited nativeRows describe the prior candidate. Full scope, native application/FIPS/TLS/regression and scan checks required for this exact image.')
    (OUT / 'build.json').write_text(json.dumps(build, indent=2) + '\n')
    print('Unrelated zlib package metadata restored; candidate not deployed')


if __name__ == '__main__':
    main()

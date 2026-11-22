"""Exact source-inclusion/component evidence for the installed QEMU successor.

No source execution, guest-agent commands, host mutation or network access.
Reuse authenticated archives and the existing component attribution proof.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/host-successors')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
pins = read(HERE / 'host-successor-review-inputs.json')
assert sha(ROOT / 'authenticated.json') == pins['evidence']['authenticated.json']
acquired = read(ROOT / 'authenticated.json')
source = next(s for s in acquired['sources'] if s['name'] == 'qemu')
for f in source['files']:
    assert sha(ROOT / f['file']) == f['sha256']
old = read(HERE.parent / 'security-20261103/qemu-components.json')
patches_file = ROOT.parents[1] / 'security-20261114/qemu/patches.json'
assert sha(patches_file) == pins['qemuAdditional']['patchManifestSha256']
patches = [p for p in read(patches_file) if p['id'] in pins['qemuAdditional']['fixedAdvisories']]
assert len(patches) == 6
selected = set(old['sourceFiles']) | {f for p in patches for f in p['files']}
proofs = []
with tempfile.TemporaryDirectory(prefix='qemu-source-', dir=ROOT) as temporary:
    work = Path(temporary)
    with tarfile.open(ROOT / 'qemu_11.1.3+ds.orig.tar.xz') as archive:
        for path in selected - {p for p in selected if p.startswith('debian/')}:
            matches = [m for m in archive if m.isfile() and m.name == 'qemu-11.1.3/' + path]
            assert len(matches) == 1
            dest = work / path
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(archive.extractfile(matches[0]).read())
    with tarfile.open(ROOT / 'qemu_11.1.3+ds-1~bpo13+1.debian.tar.xz') as archive:
        for path in selected:
            if path.startswith('debian/'):
                dest = work / path
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(archive.extractfile(path).read())
        touched = []
        for line in archive.extractfile('debian/patches/series').read().decode().splitlines():
            if not line.strip() or line.startswith('#'):
                continue
            name = line.split()[0]
            blob = archive.extractfile('debian/patches/' + name).read()
            paths = set(re.findall(rb'^\+\+\+ (?:b/)?([^\t\n ]+)', blob, re.M))
            overlap = {p.decode() for p in paths} & selected
            if not overlap:
                continue
            assert name == 'gnu-hurd.patch' and overlap == {'meson.build'}
            for check in (True, False):
                subprocess.run(['git', 'apply', '--include=meson.build', *(['--check'] if check else []), '-'],
                               input=blob, cwd=work, check=True, capture_output=True, timeout=15)
            touched.append(name)
        assert touched == ['gnu-hurd.patch']
    # The full build graph and Debian binary-package lists are identical to
    # the previously reviewed graph, including the vendor Hurd packaging patch.
    for path, digest in old['sourceFiles'].items():
        assert sha(work / path) == digest, path
    for p in patches:
        patch = patches_file.parent / (p['commit'] + '.patch')
        assert sha(patch) == p['sha256']
        subprocess.run(['git', 'apply', '--reverse', '--check', str(patch)],
                       cwd=work, check=True, capture_output=True, timeout=15)
        proofs.append({**p, 'strictReverseCheckPassed': True,
                       'sourceFiles': {f: sha(work / f) for f in p['files']}})
payload = read(ROOT / 'verified.json')
for name, expected in old['elfFiles'].items():
    package = next(p for p in payload['payloads'] if p['package'] == name)
    elf = []
    for file, record in package['verifiedFiles'].items():
        if 'sha256' in record:
            with open('/' + file, 'rb') as stream:
                if stream.read(4) == b'\x7fELF':
                    elf.append('/' + file)
    assert sorted(elf) == sorted(expected)
out = ROOT / 'qemu-successor-source.json'
assert not out.exists()
out.write_text(json.dumps({'passed': True, 'sourceFiles': old['sourceFiles'], 'patches': proofs,
    'acquisitionSha256': sha(ROOT / 'authenticated.json'), 'payloadProofSha256': sha(ROOT / 'verified.json'),
    'componentInputSha256': sha(HERE.parent / 'security-20261103/qemu-components.json'),
    'elfFiles': old['elfFiles'], 'network': 'none', 'productionChanged': False,
    'limitations': 'Source inclusion and binary-subpackage attribution; no emulator exploit or Proxmox assessment.'}, indent=2) + '\n')
print('Six additional vendor fixes and two excluded emulator components verified; no host changes.')

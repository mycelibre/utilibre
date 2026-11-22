"""Check four retained Mongo fixes against authenticated vendor patch hunks.

Context/addition/removal bytes and order are compared. Only Git header hashes,
line offsets and mail trailers are ignored. This is not runtime verification.
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
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/successor-sources')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
read = lambda p: json.loads(Path(p).read_text())


def hunks(blob, only=None):
    if blob.startswith(b'--- a/'):
        first, second = blob.splitlines()[:2]
        assert second.startswith(b'+++ b/') and first[6:] == second[6:]
        blob = b'diff --git ' + first[4:] + b' ' + second[4:] + b'\n' + blob
    result = {}
    for part in re.split(rb'(?m)^diff --git ', blob)[1:]:
        head, *lines = part.split(b'\n')
        name = head.split()[1][2:].decode()
        if only and name != only:
            continue
        assert name not in result
        chunks, position = [], 0
        while position < len(lines):
            match = re.match(rb'^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@', lines[position])
            position += 1
            if not match:
                continue
            old, new = [int(v) if v is not None else 1 for v in match.groups()]
            chunk = []
            while old or new:
                line = lines[position]
                position += 1
                assert line[:1] in (b' ', b'+', b'-')
                old -= line[:1] in (b' ', b'-')
                new -= line[:1] in (b' ', b'+')
                assert old >= 0 and new >= 0
                chunk.append(line)
            chunks.append(chunk)
        assert chunks
        result[name] = chunks
    assert result
    return result


def main():
    acquired = read(ROOT / 'acquired.json')
    assert acquired['sourceIndexSha256'] == 'b449439c113900c8607c1005f7a1ec0704d0f3b7376ba312b2150c79e4e4e06c'
    for source in acquired['sources']:
        for file in source['files']:
            assert sha(ROOT / file['file']) == file['sha256']
    specs = [
        ('libmongocrypt_1.13.2-1+deb13u2.debian.tar.xz',
         read(HERE.parent / 'security-20261104/mongocrypt-inputs.json')['patches'],
         Path('/var/lib/utilibre-maintenance/security-20261104/mongocrypt/source'),
         ['0009_CVE-2026-106433_1_of_2.patch', '0010_CVE-2026-106433_2_of_2.patch'], None),
        ('mongo-c-driver_1.30.4-1+deb13u5.debian.tar.xz',
         read(HERE.parent / 'security-20261109/mongoc-inputs.json')['cursor']['pins'],
         HERE.parent / 'security-20261109',
         ['0025_CDRIVER-6401.patch', '0026_CVE-2026-120956.patch'],
         'src/libmongoc/src/mongoc/mongoc-cursor.c'),
    ]
    proofs = []
    for archive, pins, directory, names, only in specs:
        with tarfile.open(ROOT / archive) as tar:
            for old, name in zip(pins, names, strict=True):
                path = directory / old.get('patchFile', old['file'])
                digest = old.get('patchSha256', old.get('sha256'))
                assert sha(path) == digest
                vendor = tar.extractfile('debian/patches/' + name).read()
                if only:
                    # The same fix can have different unified-diff boundaries.
                    # Compare its actual result on the exact supported source,
                    # not a whitespace-insensitive patch ID.
                    continue
                assert hunks(path.read_bytes(), only) == hunks(vendor, only)
                proofs.append({'vendorArchive': archive, 'vendorPatch': name,
                    'vendorPatchSha256': hashlib.sha256(vendor).hexdigest(),
                    'retainedPatchSha256': digest, 'exactOrderedHunkLines': True,
                    'paths': sorted(hunks(vendor, only)), 'sourceOnly': only is not None})
    manifest = read(HERE.parent / 'security-20261109/mongoc-inputs.json')
    cursor = manifest['cursor']
    relative = cursor['files'][0]
    baseline = Path('/var/lib/utilibre-maintenance/security-20261028/bson/input/source') / relative
    assert sha(baseline) == cursor['beforeSha256']
    with tempfile.TemporaryDirectory(prefix='mongo-source-parity-', dir=ROOT) as tmp:
        work = Path(tmp)
        target = work / relative
        target.parent.mkdir(parents=True)
        target.write_bytes(baseline.read_bytes())
        with tarfile.open(ROOT / 'mongo-c-driver_1.30.4-1+deb13u5.debian.tar.xz') as tar:
            for name in ('0025_CDRIVER-6401.patch', '0026_CVE-2026-120956.patch'):
                vendor = tar.extractfile('debian/patches/' + name).read()
                sections = [b'diff --git ' + part for part in re.split(rb'(?m)^diff --git ', vendor)[1:]
                            if part.split(b'\n', 1)[0].split()[1] == ('b/' + relative).encode()]
                assert len(sections) == 1
                subprocess.run(['git', 'apply', '--check', '-'], input=sections[0], cwd=work, check=True, capture_output=True, timeout=15)
                subprocess.run(['git', 'apply', '-'], input=sections[0], cwd=work, check=True, capture_output=True, timeout=15)
        assert sha(target) == cursor['afterSha256']
        proofs.append({'vendorArchive': 'mongo-c-driver_1.30.4-1+deb13u5.debian.tar.xz',
            'vendorPatches': ['0025_CDRIVER-6401.patch', '0026_CVE-2026-120956.patch'],
            'baselineSha256': cursor['beforeSha256'], 'resultSha256': sha(target),
            'exactRetainedResult': True, 'paths': [relative],
            'method': 'git apply --check then apply, no three-way/fuzz/repair; exact resulting source hash',
            'gitVersion': subprocess.check_output(['git', '--version'], text=True, timeout=10).strip()})
    target = ROOT / 'retained-mongo-patch-comparison.json'
    assert not target.exists()
    target.write_text(json.dumps({'passed': True, 'changes': proofs,
        'sourceAcquisitionSha256': sha(ROOT / 'acquired.json'), 'scriptSha256': sha(__file__),
        'limitation': 'Exact source hunk comparison only; candidate native behavior and full source reconstruction remain required.'}, indent=2) + '\n')
    print('Four retained Mongo fixes preserved by exact vendor hunks or byte-identical resulting source')


if __name__ == '__main__':
    main()

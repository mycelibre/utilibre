"""Archive six completed scan databases, never the current scanner cache.

prepare creates a private, compressed reconstruction archive in RAM. retire
requires a native Restic restore of that archive and its exact snapshot ID.
No application, image, backup, source or raw finding report is removed.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance')
OUT = ROOT / 'security-20261115'
RAM = Path('/dev/shm/utilibre-advisory-archive-20261115')
RESTORED = Path('/dev/shm/utilibre-advisory-restore-20261115')
ROOTS = [
    'vendor-libs-20261111/scan-cache', 'seo-skill-20261112/scan-cache',
    'security-20261109/remaining-high/vendor-release-20261110/scanner-cache',
    'releases-20261111/scan-cache', 'libraries-20261111/scan-cache',
    'releases-20261106/scan-cache',
]


def sha(path):
    with open(path, 'rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def idle(paths):
    resolved = {str(p.resolve()) for p in paths}
    # Refuse an active process with an open selected file or a named cache.
    for proc in Path('/proc').glob('[0-9]*'):
        try:
            command = (proc / 'cmdline').read_bytes().replace(b'\0', b' ').decode(errors='replace')
            assert not any(str(ROOT / r) in command for r in ROOTS), 'Selected scan cache is in use'
            for fd in (proc / 'fd').iterdir():
                try:
                    assert str(fd.resolve()) not in resolved, 'Selected database is open'
                except (FileNotFoundError, PermissionError):
                    pass
        except (FileNotFoundError, ProcessLookupError, PermissionError):
            pass
    ids = subprocess.check_output(['docker', 'ps', '-aq'], text=True).split()
    if ids:
        mounts = subprocess.check_output(['docker', 'inspect', '--format', '{{range .Mounts}}{{println .Source}}{{end}}', *ids], text=True).splitlines()
        assert not any(str(p) == m or str(p).startswith(m.rstrip('/') + '/') for p in paths for m in mounts if m), 'Mounted scan input'


def prepare():
    assert not RAM.exists(), 'Preserve the existing archive'
    assert os.statvfs('/dev/shm').f_bavail * os.statvfs('/dev/shm').f_frsize > 6 * 1024**3
    paths = []
    for root in ROOTS:
        for folder, database in [('db', 'trivy.db'), ('java-db', 'trivy-java.db')]:
            p = ROOT / root / folder / database
            if p.exists():
                paths += [p, p.with_name('metadata.json')]
    assert len(paths) == 18
    for p in paths:
        assert p.is_file() and p.resolve() == p and not p.is_symlink()
    idle(paths)
    entries = [{'path': str(p.relative_to(ROOT)), 'bytes': p.stat().st_size, 'sha256': sha(p)} for p in paths]
    RAM.mkdir(mode=0o700)
    archive = RAM / 'advisory-databases.tar.zst'
    with archive.open('wb') as stream:
        tar = subprocess.Popen(['nice', '-n', '10', 'tar', '-C', str(ROOT), '-cf', '-', '--', *[r['path'] for r in entries]], stdout=subprocess.PIPE)
        try:
            subprocess.run(['nice', '-n', '10', 'zstd', '-T2', '-3', '-q'], stdin=tar.stdout, stdout=stream, check=True, timeout=600)
            assert tar.wait(timeout=30) == 0
        finally:
            if tar.poll() is None:
                tar.kill()
    proof = {'schemaVersion': 1, 'entries': entries, 'archiveSha256': sha(archive), 'archiveBytes': archive.stat().st_size}
    (RAM / 'manifest.json').write_text(json.dumps(proof, indent=2) + '\n')
    OUT.mkdir(exist_ok=True)
    (OUT / 'advisory-archive-plan.json').write_text(json.dumps(proof, indent=2) + '\n')
    print(json.dumps({'prepared': True, 'files': len(entries), 'bytes': archive.stat().st_size, 'directory': str(RAM)}))


def retire(snapshot):
    assert len(snapshot) == 64 and all(c in '0123456789abcdef' for c in snapshot)
    proof = json.loads((RAM / 'manifest.json').read_text())
    restored = RESTORED / str(RAM).lstrip('/')
    assert (restored / 'manifest.json').read_bytes() == (RAM / 'manifest.json').read_bytes()
    assert sha(restored / 'advisory-databases.tar.zst') == proof['archiveSha256'] == sha(RAM / 'advisory-databases.tar.zst')
    p = subprocess.Popen(['zstd', '-dc', str(restored / 'advisory-databases.tar.zst')], stdout=subprocess.PIPE)
    with tarfile.open(fileobj=p.stdout, mode='r|') as archive:
        for member, row in zip(archive, proof['entries'], strict=True):
            assert member.isfile() and member.name == row['path'] and member.size == row['bytes']
            assert hashlib.file_digest(archive.extractfile(member), 'sha256').hexdigest() == row['sha256']
    assert p.wait(timeout=30) == 0
    paths = [ROOT / r['path'] for r in proof['entries']]
    idle(paths)
    for path, row in zip(paths, proof['entries'], strict=True):
        assert path.resolve() == path and sha(path) == row['sha256']
    before = os.statvfs(ROOT)
    for path in paths:
        path.unlink()
    for root in ROOTS:
        (ROOT / root / 'ARCHIVED-20261115.txt').write_text(
            'Frozen advisory databases moved to encrypted Storage Box after a verified restore.\n'
            f'Restic snapshot: {snapshot}\nArchive: {RAM}/advisory-databases.tar.zst\n'
            f'SHA256: {proof["archiveSha256"]}\n'
            'Restore instructions: docs/records/maintenance-documents-2026-11-15.md\n'
            'Restore the recorded database before replay; do not silently download a newer one.\n')
    after = os.statvfs(ROOT)
    result = {**proof, 'snapshot': snapshot, 'restoreVerified': True, 'retiredFiles': len(paths), 'freedBytes': (after.f_bavail-before.f_bavail)*after.f_frsize, 'freeBytes': after.f_bavail*after.f_frsize}
    (OUT / 'advisory-archive-result.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ['snapshot','retiredFiles','restoreVerified','freedBytes','freeBytes']}))


if __name__ == '__main__':
    if sys.argv[1:] == ['prepare']:
        prepare()
    elif len(sys.argv) == 3 and sys.argv[1] == 'retire':
        retire(sys.argv[2])
    else:
        raise SystemExit('Use prepare or retire EXACT_VERIFIED_RESTIC_SNAPSHOT')

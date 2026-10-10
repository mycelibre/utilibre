#!/usr/bin/env python3
"""Publish the two reviewed copy-update sources, never runtime/user state."""
from pathlib import Path
import hashlib
import json
import posixpath
import shutil
import subprocess
import tarfile
import tempfile
import sys

root = Path(__file__).resolve().parents[2]
public = Path('/opt/utilibre/toolbox-public')
projects = {
    'lrclib': {
        'source': '/opt/utilibre/community-src/lrclib-homepage',
        'revision': 'f37c07042be1af5fdcc7932d090af32141089751',
        'version': 'f37c070-p3',
        'patch': 'deployment/community/lrclib-source.patch',
        'files': ['deployment/community/Dockerfile.lrclib',
                  'deployment/community/lrclib-source.patch',
                  'deployment/community/lrclib-server.mjs',
                  'deployment/community/lrclib-server.test.mjs',
                  'deployment/community/compose.additions.yaml',
                  'deployment/community/dumb-gateway.conf'],
    },
    'chhoto': {
        'source': '/opt/utilibre/calendar-src/chhoto-url',
        'revision': 'e18a8a0111e94be03145e95c30dcd7f41891633d',
        'version': '7.8.3-p3',
        'patch': 'deployment/chhoto/no-analytics-local-assets.patch',
        'additional_patches': ['deployment/chhoto/layout.patch'],
        'files': ['deployment/chhoto', 'docs/chhoto-deployment-2026-10-09.md'],
    },
}
if len(sys.argv) > 1:
    requested = sys.argv[1:]
    assert all(name in projects for name in requested), 'Unknown source package'
    projects = {name: projects[name] for name in requested}
stage = Path(tempfile.mkdtemp(prefix='utilibre-copy-source-', dir='/opt/utilibre'))
results = []
for name, project in projects.items():
    head = subprocess.check_output(['git', '-C', project['source'], 'rev-parse', 'HEAD'], text=True).strip()
    assert head == project['revision']
    source_tar = stage / (name + '-upstream.tar')
    subprocess.run(['git', '-C', project['source'], 'archive', '--format=tar',
                    '--output', str(source_tar), project['revision']], check=True)
    checkout = stage / (name + '-check')
    checkout.mkdir()
    with tarfile.open(source_tar) as archive:
        archive.extractall(checkout, filter='data')
    for patch in [project['patch']] + project.get('additional_patches', []):
        subprocess.run(['git', 'apply', str(root / patch)], cwd=checkout, check=True)
    archive_path = stage / (name + '-utilibre.tar.gz')
    paths = []
    for entry in project['files'] + ['deployment/community/publish-copy-sources.py',
                                    'deployment/community/check-native-copy.mjs',
                                    'docs/native-wording-2026-10-09.md']:
        path = root / entry
        paths.extend([p for p in path.rglob('*') if p.is_file()] if path.is_dir() else [path])
    with tarfile.open(archive_path, 'w:gz') as output, tarfile.open(source_tar) as upstream:
        source_names = set(upstream.getnames())
        for member in upstream.getmembers():
            assert member.isfile() or member.isdir() or member.issym(), 'Unexpected upstream device/hardlink'
            if member.issym():
                # Preserve upstream documentation-asset links only when their
                # targets remain inside the source tree after the prefix.
                target = posixpath.normpath(posixpath.join(posixpath.dirname(member.name), member.linkname))
                assert not member.linkname.startswith('/') and not target.startswith('../') and target != '..'
                assert target in source_names, 'Unresolved upstream source link'
            stream = upstream.extractfile(member) if member.isfile() else None
            member.name = 'upstream/' + member.name
            output.addfile(member, stream)
        for path in paths:
            assert path.is_file() and not path.is_symlink()
            relative = path.relative_to(root)
            assert not any(p in {'private', 'secrets', 'node_modules', '.env', 'backups'} for p in relative.parts)
            output.add(path, arcname=str(relative), recursive=False)
    destination = public / archive_path.name
    if destination.exists():
        shutil.copy2(destination, stage / ('previous-' + destination.name))
    shutil.copy2(archive_path, destination.with_suffix('.tmp'))
    destination.with_suffix('.tmp').replace(destination)
    destination.chmod(0o644)
    digest = hashlib.sha256(destination.read_bytes()).hexdigest()
    results.append({'name': name, 'version': project['version'], 'sha256': digest,
                    'url': f'https://tools.utilibre.org/utilibre-source/{destination.name}?revision={digest[:12]}'})
(stage / 'published.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps({'archives': results, 'backup': str(stage)}, indent=2))

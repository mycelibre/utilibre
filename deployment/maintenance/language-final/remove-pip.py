"""Remove only a reviewed build-time installer, never application libraries."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

spec = next(x for x in json.loads(Path(__file__).with_name('python-images.json').read_text()) if x['key'] == sys.argv[1])
assert spec['pipTrees'], 'No unreviewed package search/removal'
removed = []
for row in spec['pipTrees']:
    package = Path(row['path'])
    assert package.parent.parent.parent in {Path('/usr/local/lib'),Path('/opt/venv/lib'),Path('/app/venv/lib')}
    assert package.name == 'pip' and not package.is_symlink()
    manifest = package/'_vendor/vendor.txt'
    assert hashlib.sha256(manifest.read_bytes()).hexdigest() == row['manifestSha256']
    metadata = list(package.parent.glob('pip-*.dist-info'))
    assert len(metadata) == 1 and metadata[0].name.startswith('pip-26.')
    # pip owns this tree; actual application urllib3/msgpack/setuptools copies,
    # including those in virtual environments, are deliberately untouched.
    for target in [package, metadata[0]]:
        assert target.parent == package.parent and not target.is_symlink()
        removed.append(str(target))
        shutil.rmtree(target)
    scripts = []
    bin_dir=package.parent.parent.parent.parent/'bin'
    for target in bin_dir.glob('pip*'):
        if target.name not in {'pip', 'pip3', 'pip'+package.parent.parent.name.removeprefix('python')}:
            continue
        assert target.is_file()
        if target.is_symlink():
            assert target.resolve().parent == bin_dir
            assert target.resolve().name in {'pip','pip3','pip'+package.parent.parent.name.removeprefix('python')}
        assert 'pip._internal' in target.read_text()
        scripts.append(target)
    for target in scripts:
        removed.append(str(target))
        target.unlink()
report = Path('/usr/local/share/utilibre-language')
report.mkdir(parents=True, exist_ok=True)
(report/'removed-build-installer.json').write_text(json.dumps({'key':spec['key'], 'removed':removed, 'applicationPackagesChanged':False}, indent=2)+'\n')

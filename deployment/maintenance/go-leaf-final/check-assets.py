"""Compare candidate embed.FS contents and native inline assets with frozen input."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

here = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('embed', here / 'extract-embed.py')
embed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(embed)
root = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011')
name = sys.argv[1]
assert name in ['ntfy', 'vikunja', 'opengist', 'anubis']
blob = (root / 'output' / name).read_bytes()
selections = {
    'ntfy': [('ntfy-embed', ['site', 'docs'], None)],
    'vikunja': [('vikunja-embed', ['dist'], None)],
    'opengist': [('opengist-embed', ['assets', '.vite'], None)],
    'anubis': [('anubis-web', ['static'], 72), ('anubis-xess-complete', ['static', 'xess.css', 'xess.min.css'], 7)],
}[name]
counts = []
for directory, prefixes, count in selections:
    expected = json.loads((root / 'input' / directory / 'manifest.json').read_text())['files']
    files, tables = embed.extract(blob, prefixes, count)
    actual = [{'path': n, 'size': len(b), 'sha256': hashlib.sha256(b).hexdigest()} for n, b in sorted(files.items())]
    assert actual == expected, name + ': compiled frontend changed'
    counts.append({'filesystem': directory, 'files': len(actual), 'bytes': sum(x['size'] for x in actual)})
if name == 'anubis':
    for row in json.loads((root / 'input/anubis-assets/inline-manifest.json').read_text())['files']:
        data = (root / 'input/anubis-assets/challenge' / row['path']).read_bytes()
        assert hashlib.sha256(data).hexdigest() == row['sha256']
        assert blob.count(data) == 1, 'Candidate inline static asset differs'
result = {'application': name, 'binarySha256': hashlib.sha256(blob).hexdigest(), 'embeddedAssetsUnchanged': counts, 'passed': True}
(root / 'output' / (name + '-assets.json')).write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))

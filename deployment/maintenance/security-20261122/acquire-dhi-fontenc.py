"""Authenticate DHI's exact libfontenc successor; no build or activation."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import sys
import urllib.request


assert sys.argv[1:] == ['--download']
os.umask(0o077)
root = Path('/var/lib/utilibre-maintenance/security-20261122')
out = root / 'fontenc/dhi-source'
assert not (out / 'authenticated.json').exists(), 'Preserve completed DHI acquisition'
out.mkdir(mode=0o700, exist_ok=True)
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
index_dir = root / 'dhi-index'
receipt = json.loads((index_dir / 'review.json').read_text())
assert sha(index_dir / 'InRelease') == receipt['releaseSha256']
assert (root / 'dhi-successors/source/Sources.gz').exists()
release = (index_dir / 'verified-release').read_text()
section = release.split('\nSHA256:\n', 1)[1]
hashes = {parts[2]: (parts[0], int(parts[1])) for line in section.splitlines()
          if len(parts := line.split()) == 3 and len(parts[0]) == 64}
sources = root / 'dhi-successors/source/Sources.gz'
packages = index_dir / 'Packages.gz'
assert (sha(sources), sources.stat().st_size) == hashes['main/source/Sources.gz']
assert (sha(packages), packages.stat().st_size) == hashes['main/binary-amd64/Packages.gz']
version = '1:1.1.8-1+deb13u0+dhi1'
source_rows = [b for b in gzip.decompress(sources.read_bytes()).decode().split('\n\n')
               if b.startswith('Package: libfontenc\n') and 'Version: ' + version + '\n' in b]
binary_rows = [b for b in gzip.decompress(packages.read_bytes()).decode().split('\n\n')
               if b.startswith('Package: libfontenc1\n') and 'Version: ' + version + '\n' in b]
assert len(source_rows) == len(binary_rows) == 1
source_row, binary_row = source_rows[0], binary_rows[0]
source_dir = source_row.split('Directory: ', 1)[1].splitlines()[0]
source_files = []
for line in source_row.split('Checksums-Sha256:\n', 1)[1].splitlines():
    if not line.startswith(' '):
        break
    digest, size, name = line.split()
    if name.endswith(('.dsc', '.tar.gz')):
        source_files.append((source_dir + '/' + name, digest, int(size)))
assert len(source_files) == 2
def field(row, name):
    values = [line.split(': ', 1)[1] for line in row.splitlines()
              if line.startswith(name + ': ')]
    assert len(values) == 1
    return values[0]
source_files.append((field(binary_row, 'Filename'), field(binary_row, 'SHA256'),
                     int(field(binary_row, 'Size'))))
records = []
for relative, digest, size in source_files:
    assert relative.startswith('pool/trixie/main/l/li/') and '..' not in relative.split('/')
    assert 0 < size < 2 * 1024**2 and len(digest) == 64
    url = 'https://dhi.io/deb/debian/main/' + relative
    file = out / Path(relative).name
    if not file.exists():
        with urllib.request.urlopen(url, timeout=30) as response:
            assert response.url.startswith('https://dhi.io/deb/debian/main/')
            blob = response.read(size + 1)
        assert len(blob) == size and hashlib.sha256(blob).hexdigest() == digest
        file.write_bytes(blob)
    assert file.stat().st_size == size and sha(file) == digest
    records.append({'file': file.name, 'bytes': size, 'sha256': digest, 'url': url})
(out / 'authenticated.json').write_text(json.dumps({
    'schemaVersion': 1, 'source': 'libfontenc', 'version': version,
    'sourceIndexSha256': sha(sources), 'binaryIndexSha256': sha(packages),
    'releaseSha256': sha(index_dir / 'InRelease'), 'files': records,
    'networkRequestsMaximum': 3, 'productionChanged': False,
}, indent=2) + '\n')
print('Exact signed DHI libfontenc source and binary acquired; nothing installed.')

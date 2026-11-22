"""Bind the exporter font/raster and signed-source checks to the final image."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
from datetime import datetime, timezone

os.umask(0o077)
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122')
out = ROOT / 'vendor-debian/expanded-penpot-exporter-glibc'
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
build = read(out / 'build.json')
scope = read(out / 'scope.json')
font = read(out / 'font-native.json')
vendor = read(ROOT / 'fontenc/dhi-native/native.json')
previous_file = ROOT / 'dhi-successors/vendor-debian/expanded-penpot-exporter/application.json'
previous = read(previous_file)
assert all(x['passed'] for x in (build, scope, font, vendor, previous))
assert previous['imageId'] == build['base']
assert font['base'] == build['base'] and font['imageId'] == build['imageId']
assert vendor['vendorVersion'] == '1:1.1.8-1+deb13u0+dhi1'
assert scope['allUnrelatedImageFilesUnchanged'] and scope['configurationUnchanged']
assert not (out / 'application.json').exists()
library = '/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0'
result = subprocess.run(['docker', 'run', '--rm', '--network', 'none', '--read-only',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--cpus', '.5',
    '--memory', '128m', '--pids-limit', '32', '--log-driver', 'none',
    '--entrypoint', 'sha256sum', build['imageId'], library],
    capture_output=True, timeout=30)
assert result.returncode == 0
library_sha = result.stdout.decode().split()[0]
assert library_sha == vendor['vendorLibrarySha256']
proof = {
    'passed': True, 'date': datetime.now(timezone.utc).isoformat(),
    'base': build['base'], 'imageId': build['imageId'],
    'checks': ['Synthetic accented raster pixel parity through default and system paths',
        'Final library bytes equal signed DHI source/binary regression proof',
        'Previous exporter application bytes and configuration unchanged'],
    'fontNativeSha256': sha(out / 'font-native.json'),
    'vendorNativeSha256': sha(ROOT / 'fontenc/dhi-native/native.json'),
    'previousApplicationSha256': sha(previous_file),
    'scopeSha256': sha(out / 'scope.json'), 'librarySha256': library_sha,
    'network': 'none', 'productionChanged': False,
    'limitation': 'No new two-browser editing session; existing application workflow stays unchanged.',
}
(out / 'application.json').write_text(json.dumps(proof, indent=2) + '\n')
print('Penpot exporter final image: signed font library and native raster checks passed')

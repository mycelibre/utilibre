"""Retained fictional HEIC/AVIF examples through both Penpot library paths."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/leaves')
inputs = json.loads((HERE / 'debian-leaf-inputs.json').read_text())
fixture = Path('/var/lib/utilibre-maintenance/heif-bookworm-followup-20261012/fixtures')
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sys.argv[1:] in (['expanded-penpot-backend'], ['expanded-penpot-exporter'])
row = next(r for r in inputs['rows'] if r['key'] == sys.argv[1])
out = ROOT / 'vendor-debian' / row['key']
build = json.loads((out / 'build.json').read_text())
assert build['passed'] and not (out / 'heif-native.json').exists()
for name, digest in inputs['heifFixtures'].items():
    assert name in ('fictional.heic', 'fictional.avif') and sha(fixture / name) == digest
limits = ['--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--user', '65534:65534', '--cpus', '.5', '--memory', '256m', '--memory-swap', '256m', '--pids-limit', '64',
          '--log-driver', 'none', '--tmpfs', '/tmp:rw,size=16m,mode=1777', '-v', str(fixture) + ':/checks:ro']
proofs = []
for image in (row['base'], build['imageId']):
    for library_path in ('configured', 'system'):
        for ext in ('heic', 'avif'):
            script = "magick /checks/fictional." + ext + " /tmp/result.png; magick identify -format '%w %h ' /tmp/result.png; magick /tmp/result.png -format '%[fx:mean.r] %[fx:mean.g] %[fx:mean.b] %[fx:mean.a]' info:"
            command = ['docker', 'run', *limits]
            if library_path == 'system':
                command += ['-e', 'LD_LIBRARY_PATH=']
            command += ['--entrypoint', 'sh', image, '-ec', script]
            result = subprocess.run(command, capture_output=True, timeout=60)
            assert result.returncode == 0, 'Native decode failed; nothing approved'
            values = list(map(float, result.stdout.split()))
            assert len(values) == 6 and values[:2] == [32, 24]
            assert all(abs(actual - expected / 255) < .012 for actual, expected in zip(values[2:], (64, 128, 192, 128)))
            proofs.append({'imageId': image, 'libraryPath': library_path, 'format': ext, 'dimensionsAndRgbaPassed': True})
(out / 'heif-native.json').write_text(json.dumps({'passed': True, 'base': row['base'], 'imageId': build['imageId'],
    'checks': proofs, 'fixtureFiles': inputs['heifFixtures'], 'testSha256': sha(__file__),
    'network': 'none', 'productionChanged': False}, indent=2) + '\n')
print(row['key'] + ': HEIC/AVIF dimensions, colours and transparency pass through both library paths')

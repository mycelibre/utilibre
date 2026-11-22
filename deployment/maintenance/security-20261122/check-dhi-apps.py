"""Retained Nginx checks and native synthetic font rendering; no live data."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261122/dhi-successors')
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
inputs = read(HERE / 'dhi-successor-inputs.json')
assert sys.argv[1:] in (['frontend'], ['font'])
mode = sys.argv[1]
key = 'expanded-penpot-' + ('frontend' if mode == 'frontend' else 'exporter')
row = next(r for r in inputs['rows'] if r['key'] == key)
out = ROOT / 'vendor-debian' / key
build = read(out / 'build.json')
assert build['passed'] and read(out / 'scope.json')['passed']
if mode == 'frontend':
    original = HERE.parent / 'security-20261109/check-musl-nginx.py'
    code = original.read_text()
    replacements = [
        ("HERE = Path(__file__).resolve().parent", 'HERE = Path(' + repr(str(original.parent)) + ')'),
        ("ROOT = Path('/var/lib/utilibre-maintenance/libraries-20261111' if LIBRARIES else '/var/lib/utilibre-maintenance/security-20261109')", 'ROOT = Path(' + repr(str(ROOT)) + ')'),
        ("INPUTS = json.loads((HERE / ('../releases-20261111/libraries-inputs.json' if LIBRARIES else 'musl-inputs.json')).read_text())", 'INPUTS = json.loads(' + repr(json.dumps(inputs)) + ')'),
        ("out=ROOT/key if LIBRARIES else ROOT/'musl'/key", "out=ROOT/'vendor-debian'/key"),
        ('/lib/ld-musl-x86_64.so.1', '/usr/lib/x86_64-linux-gnu/libcrypto.so.3'),
    ]
    for old, new in replacements:
        assert code.count(old) == 1, old
        code = code.replace(old, new)
    assert code.count('/usr/share/nginx/html') == 3
    code = code.replace('/usr/share/nginx/html', '/var/www/app')
    code = code.replace('Removed libc exports', 'Removed libcrypto exports').replace('native libc ABI', 'native libcrypto ABI')
    adapter = out / 'native-nginx.py'
    assert not adapter.exists()
    adapter.write_text(code)
    with (out / 'native-nginx.log').open('wb') as log:
        subprocess.run(['python3', str(adapter), key], stdout=log, stderr=log, timeout=300, check=True)
    result = read(out / 'consumer.json')
    assert result['passed'] and result['imageId'] == build['imageId']
    result.update(fixtureSha256=sha(original), adapterSha256=sha(adapter),
        scope='Native Penpot HTML, range, compression, cache, regex routes, redirects and 404; libcrypto ABI and unchanged application bytes. No new complete collaboration test.')
    target = out / 'application.json'
    assert not target.exists()
    target.write_text(json.dumps(result, indent=2) + '\n')
else:
    limits = ['--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
        '--cpus', '1', '--memory', '384m', '--memory-swap', '384m', '--pids-limit', '64',
        '--log-driver', 'none', '--tmpfs', '/tmp:rw,size=32m,mode=1777']
    script = 'magick -background white -fill black -font /usr/share/fonts/X11/Type1/c0649bt_.pfb -pointsize 24 label:"Fictional café ñ 123" /tmp/font.png; test -s /tmp/font.png; magick identify -format "%w %h\\n" /tmp/font.png; magick /tmp/font.png -depth 8 /tmp/font.rgba; test -s /tmp/font.rgba; sha256sum /tmp/font.rgba'
    rows = []
    for image in (row['base'], build['imageId']):
        outputs = []
        for prefix in ('', 'env -u LD_LIBRARY_PATH '):
            result = subprocess.run(['docker', 'run', '--rm', *limits, '-e', 'XDG_CACHE_HOME=/tmp/cache', '--entrypoint', 'sh', image,
                '-ec', prefix + "sh -ec '" + script + "'"], capture_output=True, timeout=45)
            log = out / ('font-' + image[7:19] + ('-system' if prefix else '-default') + '.log')
            assert not log.exists(), 'Keep previous native font evidence'
            log.write_bytes(result.stdout + result.stderr)
            assert result.returncode == 0
            lines = result.stdout.decode().strip().splitlines()
            assert len(lines) == 2 and all(int(v) > 0 for v in lines[0].split())
            assert len(lines[0].split()) == 2 and len(lines[1].split()[0]) == 64
            outputs.append(result.stdout.decode().strip())
        rows.append({'imageId': image, 'pixelHashes': outputs})
    assert rows[0]['pixelHashes'] == rows[1]['pixelHashes']
    target = out / 'font-native.json'
    assert not target.exists()
    target.write_text(json.dumps({'passed': True, 'base': row['base'], 'imageId': build['imageId'],
        'date': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'rows': rows,
        'scriptSha256': sha(__file__), 'network': 'none', 'productionChanged': False,
        'limitation': 'Native synthetic Latin/accented font pixels through both configured library paths; no malformed-font exploit reproduction.'}, indent=2) + '\n')
print(key + ': native ' + mode + ' check passed')

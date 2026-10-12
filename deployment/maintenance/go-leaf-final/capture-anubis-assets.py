"""Recover only static inline assets from an isolated immutable old binary.

Native renderAppJS/bootstrap source writes these exact embedded bytes between
script tags. Each extracted script must also occur verbatim once in the frozen
ELF. No user data, live service, challenge token or HTML response is retained.
"""
import gzip
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import time
import requests

ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011')
HERE = Path(__file__).resolve().parent
IMAGE = 'sha256:8828275668b7bc675679f100970f9714f731388fbbf66ae94de8aca952e3fc4a'
NAME = 'maintenance-anubis-inline-assets'

class Scripts(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = None
        self.scripts = []
    def handle_starttag(self, tag, attrs):
        if tag == 'script':
            attrs = dict(attrs)
            self.active = [] if 'src' not in attrs and attrs.get('type') != 'application/json' else None
    def handle_data(self, data):
        if self.active is not None:
            self.active.append(data)
    def handle_endtag(self, tag):
        if tag == 'script' and self.active is not None:
            self.scripts.append(''.join(self.active).encode())
            self.active = None

def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE).strip()

try:
    docker('run', '-d', '--name', NAME, '--read-only', '--cap-drop', 'ALL',
           '--security-opt', 'no-new-privileges', '--memory', '128m', '--cpus', '.5',
           '--log-driver', 'none', '-p', '127.0.0.1:33141:8923',
           '-v', str(HERE / 'anubis-asset-policy.yaml') + ':/policy.yaml:ro', IMAGE,
           '-bind', ':8923', '-metrics-bind', '', '-policy-fname', '/policy.yaml',
           '-target', '', '-use-remote-address', '-slog-level', 'ERROR')
    for _ in range(50):
        try:
            response = requests.get('http://127.0.0.1:33141/fast', timeout=2)
            if response.status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('Old native Anubis did not start')
    binary = gzip.decompress((ROOT / 'input/anubis.gz').read_bytes())
    rows = []
    for path, destination, marker in [
        ('fast', 'proofofwork/static/js/bootstrap.mjs', b'@licstart'),
        ('preact', 'preact/static/app.js', b'')]:
        parser = Scripts()
        parser.feed(requests.get('http://127.0.0.1:33141/' + path, timeout=3).text)
        candidates = [s for s in parser.scripts if len(s) > 1000 and marker in s and binary.count(s) == 1]
        assert len(candidates) == 1, (path, 'Expected unique native inline static asset')
        content = candidates[0]
        output = ROOT / 'input/anubis-assets/challenge' / destination
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        rows.append({'path': destination, 'bytes': len(content), 'sha256': hashlib.sha256(content).hexdigest()})
    (ROOT / 'input/anubis-assets/inline-manifest.json').write_text(json.dumps({'sourceImage': IMAGE, 'files': rows}, indent=2) + '\n')
    print(json.dumps(rows))
finally:
    try:
        docker('rm', '-f', NAME)
    except subprocess.CalledProcessError:
        pass

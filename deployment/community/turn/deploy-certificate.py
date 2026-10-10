"""Separate certbot hook; never restarts or broadens the Galene relay."""
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path('/opt/utilibre/turn')
lineage = Path('/etc/letsencrypt/live/turn.utilibre.org')
if os.environ.get('RENEWED_LINEAGE') != str(lineage) or not (root / 'settings.json').exists():
    raise SystemExit(0)
assert json.loads((root / 'settings.json').read_text())['host'] == 'turn.utilibre.org'
cert, key = lineage / 'fullchain.pem', lineage / 'privkey.pem'


def openssl(*args):
    return subprocess.check_output(['openssl', *map(str, args)], stderr=subprocess.STDOUT)


openssl('x509', '-in', cert, '-noout', '-checkhost', 'turn.utilibre.org')
openssl('x509', '-in', cert, '-noout', '-checkend', '604800')
openssl('verify', '-CAfile', '/etc/ssl/certs/ca-certificates.crt', '-untrusted', cert, cert)
assert openssl('x509', '-in', cert, '-pubkey', '-noout') == openssl('pkey', '-in', key, '-pubout')
target = root / 'certs'
target.mkdir(mode=0o700, exist_ok=True)
os.chown(target, 4005, 4005)
changed = False
for source in [cert, key]:
    destination = target / source.name
    if destination.exists() and destination.read_bytes() == source.read_bytes():
        continue
    pending = target / (source.name + '.pending')
    shutil.copyfile(source, pending)
    pending.chmod(0o400)
    os.chown(pending, 4005, 4005)
    pending.replace(destination)
    changed = True
running = subprocess.check_output(['docker', 'ps', '-q', '--filter', 'label=com.docker.compose.project=utilibre-turn-option', '--filter', 'label=com.docker.compose.service=turn', '--filter', 'label=com.docker.compose.oneoff=False'], text=True).strip()
if changed and running:
    subprocess.run(['docker', 'compose', '-f', 'deployment/community/compose.turn.yaml', '--profile', 'public-turn', 'restart', 'turn'], cwd='/home/ubuntu/freetools', check=True)
print('PairDrop certificate validated; copied if changed. Disabled services were not started.')

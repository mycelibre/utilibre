"""Certbot deploy hook: validate renewed TLS material before activating it."""
import json
import os
from pathlib import Path
import shutil
import subprocess

LINEAGE = Path('/etc/letsencrypt/live/turn.utilibre.org')
if os.environ.get('RENEWED_LINEAGE') != str(LINEAGE):
    raise SystemExit(0)
ROOT = Path('/opt/utilibre/pack-data/galene-turn')
REPO = Path('/home/ubuntu/freetools')
cert = LINEAGE / 'fullchain.pem'
key = LINEAGE / 'privkey.pem'


def openssl(*args):
    return subprocess.check_output(['openssl', *map(str, args)], stderr=subprocess.STDOUT)


openssl('x509', '-in', cert, '-noout', '-checkhost', 'turn.utilibre.org')
openssl('x509', '-in', cert, '-noout', '-checkend', '604800')
openssl('verify', '-CAfile', '/etc/ssl/certs/ca-certificates.crt', '-untrusted', cert, cert)
assert openssl('x509', '-in', cert, '-pubkey', '-noout') == openssl('pkey', '-in', key, '-pubout'), 'Certificate/key mismatch'
settings = json.loads((ROOT / 'settings.json').read_text())
if settings.get('tls') and all((ROOT / 'certs' / source.name).read_bytes() == source.read_bytes() for source in [cert, key]):
    print('Relay certificate validated; unchanged material needs no restart.')
    raise SystemExit(0)
for source in [cert, key]:
    pending = ROOT / 'certs' / (source.name + '.pending')
    shutil.copyfile(source, pending)
    pending.chmod(0o400)
    os.chown(pending, 4004, 4004)
    pending.replace(ROOT / 'certs' / source.name)
env = dict(os.environ, UTILIBRE_TURN_PUBLIC_IP=settings['publicIp'])
subprocess.run(['node', 'deployment/pack/turn/prepare.mjs', '--tls'], cwd=REPO, env=env, check=True)
subprocess.run(['docker', 'compose', '-f', 'deployment/pack/compose.galene-turn.yaml', 'restart', 'turn'], cwd=REPO, check=True)
live = Path('/opt/utilibre/pack-data/galene/data/ice-servers.json')
pending = live.with_suffix('.pending')
shutil.copyfile(ROOT / 'ice-servers.ready.json', pending)
pending.chmod(0o640)
os.chown(pending, 4003, 4003)
pending.replace(live)
print('Renewed relay certificate installed; Galene will refresh its ICE configuration automatically.')

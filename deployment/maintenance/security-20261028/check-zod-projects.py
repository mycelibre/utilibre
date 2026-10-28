"""Reuse the exact existing Projects workflow in two disposable installations."""
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import time

os.umask(0o077)
HERE = Path(__file__).resolve().parent.parent / 'projects-redis-final'
OUT = Path('/var/lib/utilibre-maintenance/security-20261028/zod/projects')
build = json.loads((OUT / 'build.json').read_text())
assert build['passed'] and not (OUT / 'application.json').exists()
source = (HERE / 'check.py').read_text()
source_hash = hashlib.sha256(source.encode()).hexdigest()
assert source_hash == '42a61cd68cb8e04e8a34f4d55080610cdadffe0f565513a2c8c040710f11dde1'
assert hashlib.sha256((HERE / 'native.cjs').read_bytes()).hexdigest() == 'e2e85cae1f9e0b40ec666833f2999ac5787e1f81edb43fbde88d1ab2d144d8a7'
start = source.index('created = []\ntry:')
end = source.index('\nfloor()\ncommand(', start)
block = source[start:end]
NETWORK = 'maintenance-zod-projects'
DB, APP = NETWORK + '-db', NETWORK + '-app'


def command(args, *, data=None, timeout=60):
    p = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    if p.returncode:
        (OUT / ('application-error-' + str(time.time_ns()) + '.log')).write_bytes(p.stdout + p.stderr)
        raise RuntimeError('Projects fixture failed; private error retained')
    return p.stdout


def docker(*args, **kwargs):
    return command(['docker', *args], **kwargs)


db_image = 'sha256:b7c3316b6f8ebe6b02fd5f21f14b3952f64cfd52051ca21d9de8119226515da0'
assert docker('image', 'inspect', '--format', '{{.Id}}', db_image).decode().strip() == db_image
old = "'utilibre-postgres:16.15-alpine-gosu-security-20261011-p2'"
assert block.count(old) == 1
block = block.replace(old, repr(db_image))
assert docker('image', 'inspect', '--format', '{{.Id}}', build['candidate']).decode().strip() == build['imageId']
rows = []
for CANDIDATE in [build['base'], build['imageId']]:
    assert shutil.disk_usage('/').free >= 8 * 1024**3
    # Only the pinned local source block is evaluated, never a remote or user file.
    exec(compile(block, str(HERE / 'check.py') + ':isolated-workflow', 'exec'))
    assert native['passed']
    rows.append({'imageId': CANDIDATE, **native})
assert {k:v for k,v in rows[0].items() if k != 'imageId'} == {k:v for k,v in rows[1].items() if k != 'imageId'}
report = dict(date=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), passed=True,
              imageId=build['imageId'], nativeStartup=True, network='internal; disposable PostgreSQL',
              applicationParity=rows, sourceFixtureSha256=source_hash,
              nativeFixtureSha256=hashlib.sha256((HERE / 'native.cjs').read_bytes()).hexdigest(),
              databaseImage=db_image, changesToFixture='Only disposable names, exact app and database images, and evidence directory',
              limitations='Synthetic local password login, not a real OIDC/provider test; no visitor data or production configuration used.')
(OUT / 'application.json').write_text(json.dumps(report, indent=2) + '\n')
print('Projects baseline/candidate private login, project/board/card edit/delete, migrations and anonymous denial pass.')

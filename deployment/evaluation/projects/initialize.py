#!/usr/bin/env python3
"""Create only disposable pilot credentials; never modify an existing account."""
import os
from pathlib import Path
import secrets

root = Path('/opt/utilibre/evaluation/projects-20261009')
Path('/opt/utilibre/reports/planka-fork-20261009').mkdir(parents=True, exist_ok=True, mode=0o700)
private = root / 'private'
private.mkdir(parents=True, exist_ok=True, mode=0o700)
target = private / 'pilot.env'
if target.exists():
    raise SystemExit('Existing pilot credentials preserved; initialization not repeated')
for name in ['avatars', 'backgrounds', 'attachments']:
    directory = root / 'data' / name
    directory.mkdir(parents=True, exist_ok=True)
    os.chown(directory, 1000, 1000)
password = secrets.token_hex(24)
values = {
    'POSTGRES_USER': 'projects', 'POSTGRES_DB': 'projects', 'POSTGRES_PASSWORD': password,
    'DATABASE_URL': f'postgresql://projects:{password}@db:5432/projects',
    'SECRET_KEY': secrets.token_hex(32), 'BASE_URL': 'http://projects.invalid:1337',
    'DEFAULT_ADMIN_EMAIL': 'pilot@example.invalid', 'DEFAULT_ADMIN_USERNAME': 'fictionalpilot',
    'DEFAULT_ADMIN_PASSWORD': secrets.token_hex(24), 'DEFAULT_ADMIN_NAME': 'Fictional pilot',
    'OIDC_ENFORCED': 'false', 'ALLOW_ALL_TO_CREATE_PROJECTS': 'false', 'THEME': '{}',
    'SERVICE_NAME': 'Projects isolated evaluation', 'TRUST_PROXY': '0', 'WEBHOOKS': '[]',
}
target.write_text(''.join(f'{key}={value}\n' for key, value in values.items()))
target.chmod(0o600)
print('Isolated fictional account settings created privately')

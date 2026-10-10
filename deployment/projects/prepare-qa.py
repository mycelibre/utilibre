"""Create isolated, disposable Projects QA identities; never modify owner accounts."""
import json
import os
import re
from pathlib import Path
from secrets import token_urlsafe, token_hex
from django.db import transaction
from authentik.core.models import User, Group
from authentik.stages.authenticator_totp.models import TOTPDevice

run = os.environ.get('UTILIBRE_PROJECTS_CHECK_RUN', '')
if run and not re.fullmatch(r'[a-z0-9]{1,20}', run):
    raise ValueError('QA run must be 1–20 lowercase letters or digits')
run_suffix = '-' + run if run else ''
target = Path('/data/private/projects-check-users' + run_suffix + '.json')
if target.exists():
    raise RuntimeError('Projects QA credentials already exist; do not overwrite them')
checks = []
with transaction.atomic():
    for suffix in ['a', 'b', 'denied']:
        username = 'utilibre-projects-check-' + suffix + run_suffix
        if User.objects.filter(username=username).exists():
            raise RuntimeError('QA username already exists')
        password, key = token_urlsafe(36), token_hex(20)
        email = username + '@utilibre.org'
        user = User.objects.create(username=username, name='Utilibre Projects check ' + suffix,
            email=email, path='projects-service-checks', type='external', is_active=True,
            attributes={'verified_email': email, 'synthetic_test_account': True})
        user.set_password(password)
        user.save()
        if suffix != 'denied':
            user.ak_groups.add(Group.objects.get(name='utilibre-approved'))
        TOTPDevice.objects.create(user=user, name='Disposable Projects check', key=key, confirmed=True)
        checks.append({'username': username, 'email': email, 'password': password, 'totpKey': key})
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        json.dump(checks, output)
print('Two approved and one non-approved synthetic users prepared; no real mailbox contacted.')

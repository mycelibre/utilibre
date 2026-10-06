"""Create two clearly marked synthetic QA accounts, never modify operator accounts.
Run locally in ak shell. Disable these accounts after verification.
"""
import json
import os
from pathlib import Path
from secrets import token_urlsafe, token_hex
from authentik.core.models import User, Group
from authentik.stages.authenticator_totp.models import TOTPDevice

target = Path('/data/private/check-users.json')
if target.exists():
    raise RuntimeError('QA credentials already exist; reuse or explicitly retire them, never overwrite')
checks = []
for suffix in ['a', 'b']:
    username = 'utilibre-check-' + suffix
    if User.objects.filter(username=username).exists():
        raise RuntimeError('QA username already exists')
    password, key = token_urlsafe(36), token_hex(20)
    # Reserved QA addresses on the operator's domain pass apps' MX validation.
    # These are synthetic identities; this script never sends them email.
    email = username + '@utilibre.org'
    user = User.objects.create(username=username, name='Utilibre synthetic check ' + suffix, email=email,
        path='service-checks', type='external', is_active=True,
        attributes={'verified_email': email, 'synthetic_test_account': True})
    user.set_password(password)
    user.save()
    user.ak_groups.add(Group.objects.get(name='utilibre-approved'))
    TOTPDevice.objects.create(user=user, name='Disposable deployment check', key=key, confirmed=True)
    checks.append({'username': username, 'email': email, 'password': password, 'totpKey': key})
fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
with os.fdopen(fd, 'w') as output:
    json.dump(checks, output)
print('Created two synthetic QA users with isolated credentials and test-only MFA. No real mailbox contacted.')

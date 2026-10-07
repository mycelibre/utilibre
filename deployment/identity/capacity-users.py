"""Create/retire only uniquely marked capacity-test identities via ak shell.
Credentials stay in the existing private data directory; never printed.
"""
import json
import os
import re
from pathlib import Path
from secrets import token_urlsafe, token_hex
from django.db import transaction
from authentik.core.models import User, Group, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice

run = os.environ.get('UTILIBRE_CAPACITY_CHECK_RUN', '')
assert re.fullmatch(r'[a-z0-9]{1,12}', run), 'Explicit unique test run required'
action = os.environ.get('UTILIBRE_CAPACITY_ACTION', 'create')
assert action in ('create', 'retire')
target = Path('/data/private/capacity-users-' + run + '.json')
if action == 'create':
    assert not target.exists(), 'Never overwrite credentials from another test'
    checks = []
    with transaction.atomic():
        for suffix in ['a', 'b']:
            username = 'utilibre-cap-' + suffix + '-' + run
            assert not User.objects.filter(username=username).exists()
            email = username + '@utilibre.org'
            password, key = token_urlsafe(36), token_hex(20)
            user = User.objects.create(username=username, name='Utilibre capacity QA ' + suffix,
                email=email, path='capacity-checks', type='external', is_active=True,
                attributes={'verified_email': email, 'synthetic_test_account': True, 'capacity_run': run})
            user.set_password(password)
            user.save()
            user.groups.add(Group.objects.get(name='utilibre-approved'))
            TOTPDevice.objects.create(user=user, name='Disposable capacity check', key=key, confirmed=True)
            checks.append({'username': username, 'email': email, 'password': password, 'totpKey': key})
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as output:
            json.dump(checks, output)
    print('Two synthetic capacity identities created; credentials saved privately.')
else:
    with transaction.atomic():
        for suffix in ['a', 'b']:
            user = User.objects.get(username='utilibre-cap-' + suffix + '-' + run, path='capacity-checks')
            assert user.attributes.get('synthetic_test_account') and user.attributes.get('capacity_run') == run
            assert not user.is_superuser
            user.is_active = False
            user.set_unusable_password()
            user.save(update_fields=['is_active', 'password'])
            user.groups.clear()
            Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
            for model in [Token, AccessToken, RefreshToken, TOTPDevice]:
                model.objects.filter(user=user).delete()
    print('Capacity identities disabled; identity sessions, tokens and MFA revoked. Owner unchanged.')

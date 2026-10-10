"""Run in Authentik's native shell; only this owned fictional identity is touched."""
import json
import os
import secrets
from pathlib import Path
from django.db import transaction
from authentik.core.models import User, Group, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice

record = Path('/data/private/linkding-public-qa-20261009.json')
username = 'utilibre-linkding-public-20261009-a'
with transaction.atomic():
    if os.environ.get('UTILIBRE_LINKDING_QA_ACTION') == 'prepare':
        assert not record.exists(), 'Do not overwrite an unfinished fixture lifecycle'
        assert not User.objects.filter(username=username).exists()
        email = username + '@example.invalid'
        password, key = secrets.token_urlsafe(32), secrets.token_hex(20)
        user = User.objects.create(username=username, name='Fictional linkding public check', email=email, path='service-checks', is_active=True, attributes={'synthetic_test_account': True, 'verified_email': email})
        user.set_password(password)
        user.save(update_fields=['password'])
        user.ak_groups.add(Group.objects.get(name='utilibre-approved'))
        TOTPDevice.objects.create(user=user, name='Temporary linkding public fixture', key=key, confirmed=True)
        with os.fdopen(os.open(record, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), 'w') as target:
            json.dump({'username': username, 'password': password, 'totpKey': key}, target)
    elif os.environ.get('UTILIBRE_LINKDING_QA_ACTION') == 'retire':
        saved = json.loads(record.read_text())
        assert saved['username'] == username and not saved.get('retired')
        user = User.objects.get(username=username, path='service-checks')
        assert user.attributes.get('synthetic_test_account') and not user.is_superuser
        user.is_active = False
        user.set_unusable_password()
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.clear()
        Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
        for model in [Token, AccessToken, RefreshToken, TOTPDevice]:
            model.objects.filter(user=user).delete()
        record.write_text(json.dumps({'username': username, 'retired': True}))
    else:
        raise ValueError('Explicit prepare/retire action required')
print('Only the marked fictional linkding identity lifecycle changed.')

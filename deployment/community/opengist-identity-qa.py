"""Temporarily reuse only the retired, explicitly marked QA identity; run in ak shell.
UTILIBRE_OPENGIST_QA_ACTION=prepare or retire. Credentials stay in /data/private.
"""
import json
import os
from pathlib import Path
from secrets import token_hex, token_urlsafe
from django.db import transaction
from authentik.core.models import User, Group, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice

target = Path('/data/private/opengist-native-qa.json')
with transaction.atomic():
    user = User.objects.get(username='utilibre-check-a', path='service-checks')
    assert user.email == 'utilibre-check-a@utilibre.org'
    assert user.attributes.get('synthetic_test_account') and not user.is_superuser
    if os.environ.get('UTILIBRE_OPENGIST_QA_ACTION') == 'prepare':
        assert not user.is_active and not user.has_usable_password()
        assert not user.ak_groups.exists() and not TOTPDevice.objects.filter(user=user).exists()
        assert not target.exists(), 'Do not overwrite an unfinished QA lifecycle'
        password, key = token_urlsafe(36), token_hex(20)
        prior = {'is_active': user.is_active, 'had_usable_password': False, 'groups': [], 'totp_devices': 0}
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.add(Group.objects.get(name='utilibre-approved'))
        TOTPDevice.objects.create(user=user, name='Temporary Opengist native verification', key=key, confirmed=True)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as out:
            json.dump({'username': user.username, 'password': password, 'totpKey': key, 'prior': prior}, out)
    elif os.environ.get('UTILIBRE_OPENGIST_QA_ACTION') == 'retire':
        record = json.loads(target.read_text())
        assert record['username'] == user.username and record['prior']['is_active'] is False
        user.is_active = False
        user.set_unusable_password()
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.clear()
        Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
        for model in [Token, AccessToken, RefreshToken, TOTPDevice]:
            model.objects.filter(user=user).delete()
        record = {'username': user.username, 'prior': record['prior'], 'retired': True}
        target.write_text(json.dumps(record))
    else:
        raise ValueError('Choose prepare or retire explicitly')
print('Only the marked Opengist QA identity lifecycle was updated; no operator account was changed.')

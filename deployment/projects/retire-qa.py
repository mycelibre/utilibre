"""Retire only this deployment's three synthetic Projects identities."""
import os
import re
from django.db import transaction
from authentik.core.models import User, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice

run = os.environ.get('UTILIBRE_PROJECTS_CHECK_RUN', '')
if run and not re.fullmatch(r'[a-z0-9]{1,20}', run):
    raise ValueError('QA run must be 1–20 lowercase letters or digits')
run_suffix = '-' + run if run else ''
with transaction.atomic():
    for suffix in ['a', 'b', 'denied']:
        username = 'utilibre-projects-check-' + suffix + run_suffix
        user = User.objects.get(username=username, path='projects-service-checks')
        assert user.attributes.get('synthetic_test_account') and not user.is_superuser
        user.is_active = False
        user.set_unusable_password()
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.clear()
        Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
        for model in [Token, AccessToken, RefreshToken, TOTPDevice]:
            model.objects.filter(user=user).delete()
print('Three Projects test identities retired; sessions, tokens and test MFA revoked. Owner untouched.')

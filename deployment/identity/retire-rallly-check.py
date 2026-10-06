"""Retire only this deployment's three synthetic Rallly identities."""
from django.db import transaction
from authentik.core.models import User, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice

with transaction.atomic():
    for suffix in ['a', 'b', 'denied']:
        username = 'utilibre-rallly-check-' + suffix
        user = User.objects.get(username=username, path='rallly-service-checks')
        assert user.attributes.get('synthetic_test_account') and not user.is_superuser
        user.is_active = False
        user.set_unusable_password()
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.clear()
        Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
        for model in [Token, AccessToken, RefreshToken, TOTPDevice]:
            model.objects.filter(user=user).delete()
print('Three Rallly test identities retired; sessions, tokens and test MFA revoked. Owner untouched.')

"""Revoke only this release's explicitly marked fictional identities."""
from django.db import transaction
from authentik.core.models import User, Session, AuthenticatedSession, Token
from authentik.providers.oauth2.models import AccessToken, RefreshToken
from authentik.stages.authenticator_totp.models import TOTPDevice
with transaction.atomic():
    for suffix in ('a', 'b', 'denied'):
        user = User.objects.get(username='utilibre-projects-check-' + suffix + '-gristsec11', path='projects-service-checks')
        assert user.attributes.get('synthetic_test_account') and not user.is_superuser
        user.is_active = False
        user.set_unusable_password()
        user.save(update_fields=['is_active', 'password'])
        user.ak_groups.clear()
        Session.objects.filter(pk__in=AuthenticatedSession.objects.filter(user=user).values('session_id')).delete()
        for model in (Token, AccessToken, RefreshToken, TOTPDevice):
            model.objects.filter(user=user).delete()
print('Three release-only synthetic identities disabled; sessions, tokens and test MFA revoked. Real accounts unchanged.')

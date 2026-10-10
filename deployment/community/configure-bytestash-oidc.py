"""Provision only bytestash's native OIDC client; run with Authentik ak shell.
Secrets stay in the existing private mount. Existing users/flows are unchanged.
"""
import json, os
from pathlib import Path
from secrets import token_urlsafe
from django.db import transaction
from authentik.core.models import Application, Group
from authentik.crypto.models import CertificateKeyPair
from authentik.flows.models import Flow
from authentik.policies.models import PolicyBinding
from authentik.policies.expression.models import ExpressionPolicy
from authentik.providers.oauth2.models import OAuth2Provider, ScopeMapping
with transaction.atomic():
    members = Group.objects.get(name='utilibre-approved')
    assert not members.is_superuser
    verified = ExpressionPolicy.objects.get(name='utilibre-verified-email')
    profile = ScopeMapping.objects.get(name='Utilibre minimal profile')
    authorization = Flow.objects.get(slug='default-provider-authorization-implicit-consent')
    provider, _ = OAuth2Provider.objects.get_or_create(name='Utilibre bytestash', defaults={'authorization_flow': authorization, 'client_id': 'utilibre-bytestash', 'client_secret': token_urlsafe(48)})
    provider.authorization_flow = authorization
    provider.invalidation_flow = Flow.objects.get(slug='default-provider-invalidation-flow')
    provider.client_type = 'confidential'
    provider.grant_types = ['authorization_code']
    provider._redirect_uris = [{'matching_mode': 'strict', 'url': 'https://snippets-library.utilibre.org/api/auth/oidc/callback'}]
    provider.signing_key = CertificateKeyPair.objects.get(name='authentik Internal JWT Certificate')
    provider.access_token_validity = 'minutes=10'
    provider.save()
    provider.property_mappings.set([profile, ScopeMapping.objects.get(name='Utilibre verified email'), ScopeMapping.objects.get(managed='goauthentik.io/providers/oauth2/scope-openid')])
    app, _ = Application.objects.update_or_create(slug='bytestash', defaults={'name': 'bytestash', 'provider': provider, 'meta_launch_url': 'https://snippets-library.utilibre.org', 'policy_engine_mode': 'all', 'meta_publisher': 'Utilibre'})
    PolicyBinding.objects.update_or_create(target=app, order=0, defaults={'group': members, 'enabled': True, 'failure_result': False})
    PolicyBinding.objects.update_or_create(target=app, order=1, defaults={'policy': verified, 'enabled': True, 'failure_result': False})
    private = Path('/data/private'); private.mkdir(mode=0o700, exist_ok=True)
    with os.fdopen(os.open(private/'bytestash-oidc.json', os.O_CREAT|os.O_WRONLY|os.O_TRUNC, 0o600), 'w') as target:
        json.dump({'client_id': provider.client_id, 'client_secret': provider.client_secret}, target)
print('bytestash OIDC client configured; approved verified accounts only; no user changes.')

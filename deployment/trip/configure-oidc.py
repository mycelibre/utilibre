"""Native TRIP-only authentik client; shared identity policy is preserved.

Run through the existing authentik ``ak shell`` after a consistent identity backup.
No users, account verification, invitations or existing clients are changed.
"""
import json
import os
from pathlib import Path
from secrets import token_hex

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
    authorization = Flow.objects.get(slug='default-provider-authorization-implicit-consent')
    provider, _ = OAuth2Provider.objects.get_or_create(
        name='Utilibre TRIP', defaults={
            'authorization_flow': authorization,
            'client_id': 'utilibre-trip', 'client_secret': token_hex(32),
        },
    )
    provider.authorization_flow = authorization
    provider.invalidation_flow = Flow.objects.get(slug='default-provider-invalidation-flow')
    provider.client_type = 'confidential'
    provider.grant_types = ['authorization_code']
    provider._redirect_uris = [{
        'matching_mode': 'strict', 'url': 'https://trip.utilibre.org/auth',
    }]
    provider.signing_key = CertificateKeyPair.objects.get(name='authentik Internal JWT Certificate')
    provider.access_token_validity = 'minutes=10'
    provider.include_claims_in_id_token = True
    provider.save()
    provider.property_mappings.set([
        ScopeMapping.objects.get(name='Utilibre minimal profile'),
        ScopeMapping.objects.get(name='Utilibre verified email'),
        ScopeMapping.objects.get(managed='goauthentik.io/providers/oauth2/scope-openid'),
    ])
    app, _ = Application.objects.update_or_create(slug='trip', defaults={
        'name': 'TRIP', 'provider': provider,
        'meta_launch_url': 'https://trip.utilibre.org',
        'policy_engine_mode': 'all', 'meta_publisher': 'Utilibre',
    })
    PolicyBinding.objects.update_or_create(target=app, order=0, defaults={
        'group': members, 'enabled': True, 'failure_result': False,
    })
    PolicyBinding.objects.update_or_create(target=app, order=1, defaults={
        'policy': verified, 'enabled': True, 'failure_result': False,
    })
    cohort, _ = Group.objects.get_or_create(name='utilibre-trip-members')
    PolicyBinding.objects.update_or_create(target=app, order=2, defaults={'group': cohort, 'enabled': True, 'failure_result': False})
    private = Path('/data/private')
    private.mkdir(mode=0o700, exist_ok=True)
    with os.fdopen(os.open(private / 'trip-oidc.json',
                          os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600), 'w') as target:
        json.dump({'client_id': provider.client_id, 'client_secret': provider.client_secret}, target)
print('TRIP native OIDC configured; existing approved and verified accounts only.')

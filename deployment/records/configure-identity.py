"""Add native OIDC clients; preserve every existing account and access policy."""
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
    for slug, name, callback in [
        ('grist', 'Grist', '/oauth2/callback'),
        ('candlr', 'Candlr', '/oidc-callback'),
    ]:
        authorization = Flow.objects.get(slug='default-provider-authorization-implicit-consent')
        provider, _ = OAuth2Provider.objects.get_or_create(name='Utilibre ' + name, defaults={
            'authorization_flow': authorization,
            'client_id': 'utilibre-' + slug, 'client_secret': token_urlsafe(48)})
        provider.authorization_flow = authorization
        provider.invalidation_flow = Flow.objects.get(slug='default-provider-invalidation-flow')
        provider.client_type = 'confidential'
        provider.grant_types = ['authorization_code', 'refresh_token']
        provider._redirect_uris = [{'matching_mode': 'strict', 'url': 'https://' + slug + '.utilibre.org' + callback}]
        provider.signing_key = CertificateKeyPair.objects.get(name='authentik Internal JWT Certificate')
        provider.access_token_validity = 'minutes=10'
        provider.include_claims_in_id_token = True
        provider.save()
        provider.property_mappings.set([
            ScopeMapping.objects.get(name='Utilibre minimal profile'),
            ScopeMapping.objects.get(name='Utilibre verified email'),
            ScopeMapping.objects.get(managed='goauthentik.io/providers/oauth2/scope-openid')])
        app, _ = Application.objects.update_or_create(slug=slug, defaults={
            'name': name, 'provider': provider, 'meta_launch_url': 'https://' + slug + '.utilibre.org/',
            'policy_engine_mode': 'all', 'meta_publisher': 'Utilibre'})
        PolicyBinding.objects.update_or_create(target=app, order=0, defaults={
            'group': Group.objects.get(name='utilibre-approved'), 'enabled': True, 'failure_result': False})
        PolicyBinding.objects.update_or_create(target=app, order=1, defaults={
            'policy': ExpressionPolicy.objects.get(name='utilibre-verified-email'), 'enabled': True, 'failure_result': False})
        target = Path('/data/private/' + slug + '-oidc.json')
        with os.fdopen(os.open(target, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600), 'w') as out:
            json.dump({'client_id': provider.client_id, 'client_secret': provider.client_secret}, out)
print('Grist and Candlr clients configured for existing approved, verified identities.')

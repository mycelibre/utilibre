"""Add only Rallly's native OIDC client; do not touch users or existing clients."""
import json
import os
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
    authorization = Flow.objects.get(slug="default-provider-authorization-implicit-consent")
    provider, _ = OAuth2Provider.objects.get_or_create(name="Utilibre rallly", defaults={
        "authorization_flow": authorization, "client_id": "utilibre-rallly",
        "client_secret": token_urlsafe(48),
    })
    provider.authorization_flow = authorization
    provider.invalidation_flow = Flow.objects.get(slug="default-provider-invalidation-flow")
    provider.client_type = "confidential"
    provider.grant_types = ["authorization_code", "refresh_token"]
    provider._redirect_uris = [{"matching_mode": "strict", "url": "https://poll.utilibre.org/api/auth/callback/oidc"}]
    provider.signing_key = CertificateKeyPair.objects.get(name="authentik Internal JWT Certificate")
    provider.access_token_validity = "minutes=10"
    provider.refresh_token_validity = "days=7"
    provider.save()
    provider.property_mappings.set([
        ScopeMapping.objects.get(managed="goauthentik.io/providers/oauth2/scope-openid"),
        ScopeMapping.objects.get(name="Utilibre minimal profile"),
        ScopeMapping.objects.get(name="Utilibre verified email"),
    ])
    app, _ = Application.objects.update_or_create(slug="rallly", defaults={
        "name": "Rallly", "provider": provider, "meta_launch_url": "https://poll.utilibre.org",
        "policy_engine_mode": "all", "meta_publisher": "Utilibre",
    })
    members = Group.objects.get(name="utilibre-approved")
    verified = ExpressionPolicy.objects.get(name="utilibre-verified-email")
    PolicyBinding.objects.update_or_create(target=app, order=0, defaults={"group": members, "enabled": True, "failure_result": False})
    PolicyBinding.objects.update_or_create(target=app, order=1, defaults={"policy": verified, "enabled": True, "failure_result": False})
    path = Path("/data/private/oidc-clients.json")
    credentials = json.loads(path.read_text())
    credentials["rallly"] = {"client_id": provider.client_id, "client_secret": provider.client_secret}
    fd = os.open(path, os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as target:
        json.dump(credentials, target)
print("Rallly OIDC client configured with existing approved-group and verified-email policies; other clients unchanged.")

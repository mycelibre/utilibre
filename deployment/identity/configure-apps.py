"""Idempotent native OIDC clients and invitation-only enrollment (run in ak shell).

Client secrets are written only to private mounted data, never stdout.
Does not change owner credentials, MFA devices, or existing application data.
"""
import json
import os
from pathlib import Path
from secrets import token_urlsafe

from django.db import transaction
from authentik.core.models import Application, Group, User
from authentik.crypto.models import CertificateKeyPair
from authentik.flows.models import Flow, FlowStageBinding
from authentik.policies.models import PolicyBinding
from authentik.policies.expression.models import ExpressionPolicy
from authentik.policies.password.models import PasswordPolicy
from authentik.providers.oauth2.models import OAuth2Provider, ScopeMapping
from authentik.stages.invitation.models import InvitationStage
from authentik.stages.prompt.models import Prompt, PromptStage
from authentik.stages.user_write.models import UserWriteStage
from authentik.stages.user_login.models import UserLoginStage
from authentik.stages.email.models import EmailStage
from authentik.stages.authenticator_totp.models import AuthenticatorTOTPStage

apps = {
    "resume": ("Reactive Resume", "https://cv.utilibre.org", "/api/auth/callback/custom"),
    "penpot": ("Penpot", "https://design.utilibre.org", "/api/auth/oidc/callback"),
    "actual": ("Actual Budget", "https://budget.utilibre.org", "/openid/callback"),
    "wakapi": ("Wakapi", "https://wakapi.utilibre.org", "/oidc/utilibre/callback"),
    "rallly": ("Rallly", "https://poll.utilibre.org", "/api/auth/callback/oidc"),
}

with transaction.atomic():
    members, _ = Group.objects.get_or_create(name="utilibre-approved", defaults={"is_superuser": False})
    assert not members.is_superuser
    owner = User.objects.get(username="akadmin", email="admin@utilibre.org")
    members.users.add(owner)
    # The operator has already confirmed delivery to this exact mailbox.
    owner.attributes["verified_email"] = owner.email
    owner.save(update_fields=["attributes"])
    verified, _ = ExpressionPolicy.objects.update_or_create(name="utilibre-verified-email", defaults={
        "expression": 'return bool(request.user.is_active and request.user.email and request.user.attributes.get("verified_email") == request.user.email)',
    })
    email_scope, _ = ScopeMapping.objects.update_or_create(name="Utilibre verified email", defaults={
        "scope_name": "email", "expression": 'return {"email": request.user.email, "email_verified": bool(request.user.email and request.user.attributes.get("verified_email") == request.user.email)}',
    })
    profile_scope, _ = ScopeMapping.objects.update_or_create(name="Utilibre minimal profile", defaults={
        "scope_name": "profile", "expression": 'return {"name": request.user.name, "preferred_username": "utilibre-admin" if request.user.username == "akadmin" else request.user.username}',
    })
    openid = ScopeMapping.objects.get(managed="goauthentik.io/providers/oauth2/scope-openid")
    offline = ScopeMapping.objects.get(managed="goauthentik.io/providers/oauth2/scope-offline_access")
    signing_key = CertificateKeyPair.objects.get(name="authentik Internal JWT Certificate")
    authorization = Flow.objects.get(slug="default-provider-authorization-implicit-consent")
    invalidation = Flow.objects.get(slug="default-provider-invalidation-flow")
    credentials = {}
    for slug, (name, origin, callback) in apps.items():
        provider, created = OAuth2Provider.objects.get_or_create(name=f"Utilibre {slug}", defaults={
            "authorization_flow": authorization, "client_id": f"utilibre-{slug}",
            "client_secret": token_urlsafe(48),
        })
        provider.authorization_flow = authorization
        provider.invalidation_flow = invalidation
        provider.client_type = "confidential"
        provider.grant_types = ["authorization_code", "refresh_token"]
        provider._redirect_uris = [{"matching_mode": "strict", "url": origin + callback}]
        provider.signing_key = signing_key
        provider.access_token_validity = "minutes=10"
        provider.refresh_token_validity = "days=7"
        provider.save()
        provider.property_mappings.set([openid, profile_scope, email_scope, offline])
        app, _ = Application.objects.update_or_create(slug=slug, defaults={
            "name": name, "provider": provider, "meta_launch_url": origin,
            "policy_engine_mode": "all", "meta_publisher": "Utilibre",
        })
        PolicyBinding.objects.update_or_create(target=app, order=0, defaults={"group": members, "enabled": True, "failure_result": False})
        PolicyBinding.objects.update_or_create(target=app, order=1, defaults={"policy": verified, "enabled": True, "failure_result": False})
        credentials[slug] = {"client_id": provider.client_id, "client_secret": provider.client_secret}

    flow, _ = Flow.objects.update_or_create(slug="utilibre-invitation", defaults={
        "name": "Utilibre approved invitation", "title": "Utilibre · Activate your account / Activá tu cuenta",
        "designation": "enrollment", "authentication": "require_unauthenticated",
    })
    invitation, _ = InvitationStage.objects.update_or_create(name="utilibre-invitation-required", defaults={"continue_flow_without_invitation": False})
    fields = []
    for order, (key, label, kind) in enumerate([
        ("name", "Name / Nombre", "text"),
        ("password", "Password / Contraseña", "password"),
        ("password_repeat", "Repeat password / Repetí la contraseña", "password"),
    ]):
        field, _ = Prompt.objects.update_or_create(name=f"utilibre-invitation-{key}", defaults={
            "field_key": key, "label": label, "type": kind, "required": True,
            "order": order, "placeholder": label,
        })
        fields.append(field)
    prompt, _ = PromptStage.objects.get_or_create(name="utilibre-invitation-details")
    prompt.fields.set(fields)
    password_policy, _ = PasswordPolicy.objects.update_or_create(name="utilibre-invitation-password", defaults={
        "length_min": 12, "check_static_rules": True, "check_have_i_been_pwned": False,
        "check_zxcvbn": False, "error_message": "Use at least 12 characters. / Usá al menos 12 caracteres.",
    })
    prompt.validation_policies.set([password_policy])
    write, _ = UserWriteStage.objects.update_or_create(name="utilibre-invitation-create", defaults={
        "user_creation_mode": "always_create", "create_users_as_inactive": True,
        "create_users_group": members, "user_type": "external", "user_path_template": "users/utilibre",
    })
    fixed_identity, _ = ExpressionPolicy.objects.update_or_create(name="utilibre-invitation-fixed-identity", defaults={
        "expression": 'invite = request.context.get("invitation")\ndata = request.context.get("prompt_data", {})\nif not invite or not invite.fixed_data.get("username") or not invite.fixed_data.get("email"):\n    return False\nrequest.context["prompt_data"] = {key: data[key] for key in ["name", "password", "password_repeat"] if key in data}\nrequest.context["prompt_data"].update({key: invite.fixed_data[key] for key in ["username", "email"]})\nreturn True',
    })
    email, _ = EmailStage.objects.update_or_create(name="utilibre-invitation-verify-email", defaults={
        "use_global_settings": True, "template": "email/utilibre-account-confirmation.html",
        "activate_user_on_success": True, "token_expiry": "minutes=30",
        "subject": "Utilibre · Verify your email / Verificá tu correo",
    })
    mfa = AuthenticatorTOTPStage.objects.get(name="default-authenticator-totp-setup")
    login, _ = UserLoginStage.objects.get_or_create(name="utilibre-invitation-login")
    stamp, _ = ExpressionPolicy.objects.update_or_create(name="utilibre-invitation-email-confirmed", defaults={
        "expression": 'user = request.context.get("pending_user")\nif not user or not user.is_active:\n    return False\nuser.attributes["verified_email"] = user.email\nuser.save(update_fields=["attributes"])\nreturn True',
    })
    for order, stage in [(0, invitation), (10, prompt), (20, write), (30, email), (40, mfa), (100, login)]:
        binding, _ = FlowStageBinding.objects.update_or_create(target=flow, order=order, defaults={
            "stage": stage, "evaluate_on_plan": False, "re_evaluate_policies": True,
        })
        if stage == login:
            PolicyBinding.objects.update_or_create(target=binding, order=0, defaults={"policy": stamp, "failure_result": False})
        if stage == write:
            PolicyBinding.objects.update_or_create(target=binding, order=0, defaults={"policy": fixed_identity, "failure_result": False})

    private_dir = Path("/data/private")
    private_dir.mkdir(mode=0o700, exist_ok=True)
    path = private_dir / "oidc-clients.json"
    fd = os.open(path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as target:
        json.dump(credentials, target)
print(f"{len(apps)} group-restricted OIDC clients configured; exact HTTPS callbacks; minimal verified claims.")
print("Invitation-only enrollment configured. Public registration is still closed. Owner credentials unchanged.")

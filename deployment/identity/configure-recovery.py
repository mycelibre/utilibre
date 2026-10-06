"""Apply after the operator confirms test-mail delivery. Never reset an account here.

Uses the pinned upstream email+MFA recovery blueprint, with local security settings.
Run with: ak shell -c 'import sys; exec(sys.stdin.read())' < configure-recovery.py
"""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse
import socket
import smtplib
import ssl

from django.db import transaction
from authentik.lib.config import CONFIG
from authentik.blueprints.v1.importer import Importer
from authentik.brands.models import Brand
from authentik.core.models import User
from authentik.flows.models import Flow, FlowStageBinding, NotConfiguredAction
from authentik.stages.email.models import EmailStage
from authentik.stages.identification.models import IdentificationStage
from authentik.stages.authenticator_totp.models import AuthenticatorTOTPStage
from authentik.stages.authenticator_validate.models import AuthenticatorValidateStage
from authentik.stages.prompt.models import PromptStage
from authentik.policies.password.models import PasswordPolicy
from authentik.policies.types import PolicyRequest

assert CONFIG.get("email.host") == "mx.mailgt.dev"
assert CONFIG.get_bool("email.use_tls")
assert CONFIG.get("email.from") == "no-reply@utilibre.org"
assert socket.gethostbyname("mx.mailgt.dev") == "10.10.1.20"
with smtplib.SMTP("mx.mailgt.dev", 26, timeout=10) as smtp:
    smtp.ehlo("auth.utilibre.org")
    smtp.starttls(context=ssl.create_default_context())
public_probe = Request("https://auth.utilibre.org/", headers={"User-Agent": "Utilibre-Deployment-Check/1.0"})
with urlopen(public_probe, timeout=15) as response:
    assert response.status == 200
    assert urlparse(response.url).scheme == "https"
    assert urlparse(response.url).hostname == "auth.utilibre.org"

source = Path("/blueprints/example/flows-recovery-email-mfa-verification.yaml").read_text()
source = source.replace("default-recovery", "utilibre-recovery")
source = source.replace("Change your password", "Utilibre recovery password")
with transaction.atomic():
    importer = Importer.from_string(source)
    valid, _ = importer.validate()
    if not valid or not importer.apply():
        raise RuntimeError("Upstream recovery blueprint did not validate/apply")

    flow = Flow.objects.get(slug="utilibre-recovery-flow")
    email = EmailStage.objects.get(name="utilibre-recovery-email")
    email.use_global_settings = True
    email.activate_user_on_success = False
    email.token_expiry = "minutes=15"
    email.recovery_max_attempts = 3
    email.recovery_cache_timeout = "minutes=15"
    email.subject = "Utilibre · password recovery"
    email.save()

    mfa = AuthenticatorValidateStage.objects.get(name="utilibre-recovery-mfa")
    mfa.not_configured_action = NotConfiguredAction.CONFIGURE
    mfa.device_classes = ["totp", "webauthn", "static"]
    mfa.configuration_stages.set([AuthenticatorTOTPStage.objects.get(name="default-authenticator-totp-setup")])
    mfa.save()

    policy, _ = PasswordPolicy.objects.update_or_create(name="utilibre-recovery-password-policy", defaults={
        "length_min": 12, "check_static_rules": True, "check_have_i_been_pwned": False,
        "check_zxcvbn": False, "error_message": "Use at least 12 characters. / Usá al menos 12 caracteres.",
    })
    prompt = PromptStage.objects.get(name="Utilibre recovery password")
    prompt.validation_policies.set([policy])
    request = PolicyRequest(User.objects.get(username="akadmin"))
    request.context["password"] = "short"
    assert not policy.passes(request).passing
    request.context["password"] = "example-only-long-test-passphrase"
    assert policy.passes(request).passing
    stages = list(FlowStageBinding.objects.filter(target=flow).order_by("order").values_list("stage__name", flat=True))
    assert stages.index(email.name) < stages.index(mfa.name) < stages.index(prompt.name)

    identification = IdentificationStage.objects.get(name="utilibre-recovery-identification")
    identification.show_matched_user = False
    identification.pretend_user_exists = True
    identification.save()
    brand = Brand.objects.get(default=True)
    brand.flow_recovery = flow
    brand.save(update_fields=["flow_recovery"])
    login = IdentificationStage.objects.get(name="default-authentication-identification")
    login.recovery_flow = flow
    login.save(update_fields=["recovery_flow"])
print("Recovery configured: email verification, MFA, password policy; enrollment remains closed.")
print("No password, account activation or MFA enrollment was changed.")

"""Run through `ak shell`; local configuration only, no passwords or tokens printed."""
from authentik.brands.models import Brand
from authentik.core.models import User
from authentik.stages.identification.models import IdentificationStage
from authentik.stages.authenticator_totp.models import AuthenticatorTOTPStage
from authentik.stages.authenticator_validate.models import AuthenticatorValidateStage
from authentik.flows.models import Flow, NotConfiguredAction
from authentik.tenants.utils import get_current_tenant

tenant = get_current_tenant()
tenant.avatars = "initials"  # Do not send email-derived hashes to Gravatar.
tenant.event_retention = "days=30"
tenant.impersonation = False
tenant.save(update_fields=["avatars", "event_retention", "impersonation"])

owner = User.objects.get(username="akadmin")
if owner.email != "admin@utilibre.org" or not owner.has_usable_password():
    raise RuntimeError("Owner bootstrap has not completed correctly")
owner.name = "Utilibre administrator"
owner.save(update_fields=["name"])

brand = Brand.objects.get(default=True)
brand.domain = "auth.utilibre.org"
brand.branding_title = "Utilibre · authentik"
# configure-recovery.py creates this flow only after delivery and HTTPS checks.
brand.flow_recovery = Flow.objects.filter(slug="utilibre-recovery-flow").first()
brand.flow_request = None
brand.save()

identification = IdentificationStage.objects.get(name="default-authentication-identification")
identification.enrollment_flow = None
identification.recovery_flow = brand.flow_recovery
identification.show_matched_user = False
identification.save()

# The real owner enrolls their authenticator on first login; never invent a
# shared second factor or include its secret in deployment files/screenshots.
mfa = AuthenticatorValidateStage.objects.get(name="default-authentication-mfa-validation")
mfa.not_configured_action = NotConfiguredAction.CONFIGURE
mfa.configuration_stages.set([AuthenticatorTOTPStage.objects.get(name="default-authenticator-totp-setup")])
mfa.device_classes = ["totp", "webauthn", "static"]
mfa.save()
print("Owner verified; enrollment closed; explicit recovery configuration preserved; first-login MFA setup required.")

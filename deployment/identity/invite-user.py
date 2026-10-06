"""Run in ak shell after explicit operator approval.

Input JSON is passed in UTILIBRE_INVITEE; username/email are fixed, not user-editable.
Sends one private, expiring invitation to the approved address; prints no token.
"""
import json
import os
import re
from datetime import timedelta
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.utils import timezone
from authentik.core.models import User
from authentik.flows.models import Flow
from authentik.stages.invitation.models import Invitation

data = json.loads(os.environ['UTILIBRE_INVITEE'])
username, email = data['username'].lower(), data['email'].strip().lower()
if not re.fullmatch(r'[a-z][a-z0-9_-]{2,39}', username) or username in ['akadmin', 'utilibre-admin'] or username.startswith('utilibre-check-'):
    raise ValueError('Choose a non-reserved username: 3–40 lowercase letters, digits, underscore or hyphen')
validate_email(email)
if User.objects.filter(username__iexact=username).exists() or User.objects.filter(email__iexact=email).exists():
    raise ValueError('An account already uses that username or email; do not create a duplicate')
flow = Flow.objects.get(slug='utilibre-invitation')
invite = Invitation.objects.create(name=f'Approved: {username}', flow=flow, single_use=True,
    created_by=User.objects.get(username='akadmin'), expires=timezone.now()+timedelta(days=2),
    fixed_data={'username': username, 'email': email})
link = f'https://auth.utilibre.org/if/flow/{flow.slug}/?itoken={invite.pk}'
message = f'''Your Utilibre account request was approved. / Tu solicitud de cuenta de Utilibre fue aprobada.

Activate your account / Activá tu cuenta:
{link}

Username / Usuario: {username}
This private, single-use link expires in 48 hours. You will verify your email and set up an authenticator.
Este enlace privado de un solo uso vence en 48 horas. Vas a verificar tu correo y configurar un autenticador.

If you did not request access, ignore this message. / Si no solicitaste acceso, ignorá este mensaje.
Utilibre: https://utilibre.org/
'''
try:
    sent = send_mail('Utilibre · Your invitation / Tu invitación', message, 'no-reply@utilibre.org', [email], fail_silently=False)
    if sent != 1:
        raise RuntimeError('Invitation email not accepted by relay')
except Exception:
    invite.delete()
    raise
print('Approved invitation sent. Single-use, 48-hour expiry; no administrator role granted.')

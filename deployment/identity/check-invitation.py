"""Local invitation rehearsal. Captures mail and rolls back the synthetic user."""
import json
import re
import html
import base64
from datetime import timedelta
from secrets import token_urlsafe
from urllib.parse import urlparse, urlencode, parse_qs
from unittest.mock import patch
from django.db import transaction
from django.test import Client
from django.utils import timezone
from authentik.core.models import User
from authentik.flows.models import Flow
from authentik.stages.invitation.models import Invitation
from authentik.stages.authenticator.oath import TOTP
from authentik.stages.authenticator_totp.models import TOTPDevice

endpoint='/api/v3/flows/executor/utilibre-invitation/'
def client_new():
    return Client(HTTP_HOST='auth.utilibre.org',HTTP_ORIGIN='https://auth.utilibre.org')
def advance(client,response,query=''):
    for _ in range(12):
        if response.status_code not in (301,302,303,307,308):
            return response.json()
        response=client.get(endpoint,{'query':query},secure=True)
    raise RuntimeError('Invitation did not advance')
def post(client,query,data):
    return advance(client,client.post(endpoint+'?'+urlencode({'query':query}),data=json.dumps(data),content_type='application/json',secure=True),query)

with transaction.atomic():
    client=client_new()
    denied=advance(client,client.get(endpoint,secure=True))
    assert denied.get('component')=='ak-stage-access-denied', 'Missing invitation must be rejected'
    username='utilibre-check-invitation'
    assert not User.objects.filter(username=username).exists()
    invite=Invitation.objects.create(name='Synthetic invitation rehearsal',flow=Flow.objects.get(slug='utilibre-invitation'),single_use=True,
        created_by=User.objects.get(username='akadmin'),expires=timezone.now()+timedelta(minutes=5),
        fixed_data={'username':username,'email':username+'@utilibre.org'})
    query=urlencode({'itoken':str(invite.pk)})
    client=client_new()
    challenge=advance(client,client.get(endpoint,{'query':query},secure=True),query)
    assert challenge.get('component')=='ak-stage-prompt',challenge.get('component')
    password=token_urlsafe(32)
    with patch('authentik.stages.email.stage.send_mails') as send:
        challenge=post(client,query,{'component':'ak-stage-prompt','name':'Synthetic invitation check','password':password,'password_repeat':password,
            'username':'akadmin','email':'changed@example.invalid','is_superuser':True})
        assert challenge.get('component')=='ak-stage-email',challenge.get('component')
        user=User.objects.get(username=username)
        assert not user.is_active and user.email==username+'@utilibre.org'
        assert user.ak_groups.filter(name='utilibre-approved',is_superuser=False).exists()
        assert not user.is_superuser
        assert send.call_count==1
        message=send.call_args.args[1]
        link=next(html.unescape(url) for url in re.findall(r'https?://[^\s"<>]+',message.body) if 'token=' in url)
        query=urlparse(link).query
        challenge=advance(client,client.get(endpoint,{'query':query},secure=True),query)
        if challenge.get('component')=='ak-stage-consent':
            challenge=post(client,query,{'component':'ak-stage-consent','token':challenge['token']})
        assert challenge.get('component')=='ak-stage-authenticator-totp',challenge.get('component')
        setup=parse_qs(urlparse(challenge['config_url']).query)
        totp=TOTP(base64.b32decode(setup['secret'][0]),int(setup.get('period',['30'])[0]),0,int(setup.get('digits',['6'])[0]),0)
        challenge=post(client,query,{'component':'ak-stage-authenticator-totp','code':str(totp.token()).zfill(int(setup.get('digits',['6'])[0]))})
        assert challenge.get('type')=='redirect' or challenge.get('component')=='xak-flow-redirect',challenge.get('component')
        user.refresh_from_db()
        assert user.is_active and user.attributes.get('verified_email')==user.email
        assert TOTPDevice.objects.filter(user=user,confirmed=True).exists()
        assert not Invitation.objects.filter(pk=invite.pk).exists()
    transaction.set_rollback(True)
print('Invitation passed: required token, fixed identity, inactive until email verified, MFA required, no admin role, single-use. Synthetic data rolled back; no email sent.')

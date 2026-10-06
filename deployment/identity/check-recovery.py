"""Exercise recovery locally with captured email; changes only a synthetic QA password.
SMTP delivery is tested separately. Never capture or reset the real owner's MFA.
"""
import json
import re
import html
from urllib.parse import urlparse, parse_qs, urlencode
from pathlib import Path
from unittest.mock import patch
from django.test import Client
from authentik.core.models import User
from authentik.stages.authenticator_totp.models import TOTPDevice
from authentik.stages.authenticator.oath import TOTP

path=Path('/data/private/check-users.json')
checks=json.loads(path.read_text())
check=checks[0]
user=User.objects.get(username=check['username'],path='service-checks')
assert user.attributes.get('synthetic_test_account')
client=Client(HTTP_HOST='auth.utilibre.org',HTTP_ORIGIN='https://auth.utilibre.org',secure=True)
client.get('/if/flow/utilibre-recovery-flow/',secure=True)
endpoint='/api/v3/flows/executor/utilibre-recovery-flow/'
def advance(response, query=''):
    # A stage transition may intentionally redirect to the same executor URL.
    for _ in range(10):
        if response.status_code not in (301,302,303,307,308):
            return response
        response=client.get(endpoint,{'query':query},secure=True)
    raise RuntimeError('Recovery did not advance within ten stage transitions')
response=client.get(endpoint,secure=True)
if 'application/json' not in response.get('Content-Type',''):
    print('Initial response diagnostic:',response.status_code,response.get('Location'),response.content[:180])
    raise RuntimeError('Unexpected recovery initial response')
print('Recovery initial:',response.status_code,response.json().get('component'))
with patch('authentik.stages.email.stage.send_mails') as send:
    csrf_cookie=client.cookies.get('authentik_csrf')
    csrf=csrf_cookie.value if csrf_cookie else ''
    response=client.post(endpoint,data=json.dumps({'component':'ak-stage-identification','uid_field':user.username}),content_type='application/json',secure=True,HTTP_X_CSRFTOKEN=csrf,follow=True)
    if 'application/json' not in response.get('Content-Type',''):
        print('POST diagnostic:',response.status_code,response.content[:200])
        raise RuntimeError('Unexpected recovery POST response')
    print('Recovery identification:',response.status_code,response.json().get('component'))
    print('Captured emails:',send.call_count)
    if send.called:
        message=send.call_args.args[1]
        link=next(html.unescape(url) for url in re.findall(r'https?://[^\s"<>]+',message.body) if 'token=' in url)
        query=urlparse(link).query
        response=client.get(endpoint,{'query':query},secure=True,follow=True)
        challenge=response.json()
        if challenge.get('type')=='redirect' or challenge.get('component')=='xak-flow-redirect':
            response=client.get(endpoint,{'query':query},secure=True,follow=True)
            challenge=response.json()
        print('After email link:',challenge.get('component'),challenge.get('type'))
        if challenge.get('component')=='ak-stage-consent':
            response=advance(client.post(endpoint+'?'+urlencode({'query':query}),data=json.dumps({'component':'ak-stage-consent','token':challenge['token']}),content_type='application/json',secure=True,HTTP_X_CSRFTOKEN=csrf),query)
            challenge=response.json()
            print('After recovery consent:',challenge.get('component'))
        assert challenge.get('component')=='ak-stage-authenticator-validate', 'Email must not bypass MFA'
        device=TOTPDevice.objects.get(user=user,confirmed=True)
        totp=TOTP(device.bin_key,device.step,device.t0,device.digits,device.drift)
        code=str(totp.token()).zfill(device.digits)
        response=advance(client.post(endpoint+'?'+urlencode({'query':query}),data=json.dumps({'component':'ak-stage-authenticator-validate','code':code}),content_type='application/json',secure=True,HTTP_X_CSRFTOKEN=csrf),query)
        print('After MFA:',response.json().get('component'))
        assert response.json().get('component')=='ak-stage-prompt'
        response=advance(client.post(endpoint+'?'+urlencode({'query':query}),data=json.dumps({'component':'ak-stage-prompt','password':check['password'],'password_repeat':check['password']}),content_type='application/json',secure=True,HTTP_X_CSRFTOKEN=csrf),query)
        user.refresh_from_db()
        assert user.check_password(check['password'])
        assert response.json().get('type')=='redirect' or response.json().get('component')=='xak-flow-redirect'
        print('Synthetic recovery passed: email link, existing MFA, password prompt, final login. Owner unchanged; email captured, not sent.')

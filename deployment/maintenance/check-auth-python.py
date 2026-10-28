"""Run only in the network-isolated restored identity clone using manage shell.
Uses native password/TOTP, OAuth authorization-code endpoint, JWKS and JWT.
Never run against the production database. Prints no tokens or user records.
"""
import os
assert os.environ.get('UTILIBRE_SECURITY_DISPOSABLE') == 'yes'
assert os.environ.get('AUTHENTIK_POSTGRESQL__HOST') == '127.0.0.1'
import json, secrets, base64, time
import jwt
from importlib.metadata import version
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from authentik.core.models import User, Application
from authentik.core.tests.utils import create_test_cert, create_test_flow
from authentik.crypto.builder import PrivateKeyAlg
from authentik.providers.oauth2.models import OAuth2Provider, AuthorizationCode, GrantType, RedirectURI, RedirectURIMatchingMode
from authentik.stages.authenticator_totp.models import TOTPDevice
from authentik.stages.authenticator.oath import TOTP
assert jwt.__version__ == '2.14.0'
assert version('anyio') == '4.14.2'
if os.environ.get('UTILIBRE_SECURITY_FRESH_FIXTURE') == 'yes':
    # Fresh disposable DB, never restored account records or production secrets.
    owner = User.objects.create(username='akadmin', email='admin@utilibre.org', is_active=True)
    owner.set_unusable_password()
    owner.save()
assert User.objects.filter(username='akadmin', email='admin@utilibre.org', is_active=True).count() == 1
uid='security-'+secrets.token_hex(8)
user=User.objects.create(username=uid,email=uid+'@example.invalid',path='service-checks',is_active=True)
password=secrets.token_urlsafe(32);user.set_password(password);user.save()
assert user.check_password(password) and not user.check_password(password+'wrong')
device=TOTPDevice.objects.create(user=user,key=secrets.token_hex(20),confirmed=True)
otp=TOTP(device.bin_key,device.step,device.t0,device.digits,device.drift);otp.time=time.time()
token=otp.token();assert device.verify_token(token);assert not device.verify_token(token)
client=Client(HTTP_HOST='auth.utilibre.org',secure=True)
assert client.get('/api/v3/core/users/me/',secure=True).status_code == 403
for algorithm in [PrivateKeyAlg.RSA,PrivateKeyAlg.ECDSA]:
    key=create_test_cert(algorithm)
    provider=OAuth2Provider.objects.create(name=uid+str(algorithm),authorization_flow=create_test_flow(),grant_types=[GrantType.AUTHORIZATION_CODE],redirect_uris=[RedirectURI(RedirectURIMatchingMode.STRICT,'https://example.invalid/callback')],signing_key=key)
    app=Application.objects.create(name=provider.name,slug=uid+str(provider.pk),provider=provider)
    code=AuthorizationCode.objects.create(code=secrets.token_urlsafe(32),provider=provider,user=user,auth_time=timezone.now())
    basic=base64.b64encode((provider.client_id+':'+provider.client_secret).encode()).decode()
    payload={'grant_type':'authorization_code','code':code.code,'redirect_uri':'https://example.invalid/callback'}
    response=client.post(reverse('authentik_providers_oauth2:token'),data=payload,HTTP_AUTHORIZATION='Basic '+basic,secure=True)
    assert response.status_code == 200, ('native token exchange',response.status_code)
    tokens=response.json()
    body=jwt.decode(tokens['access_token'],key.public_key,algorithms=[provider.jwt_key[1]],audience=provider.client_id)
    assert body['sub'] and body['iss'] and body['exp']
    jwks=client.get(reverse('authentik_providers_oauth2:jwks',kwargs={'application_slug':app.slug}),secure=True)
    assert jwks.status_code == 200
    jwt.PyJWKSet.from_dict(jwks.json())
    replay=client.post(reverse('authentik_providers_oauth2:token'),data=payload,HTTP_AUTHORIZATION='Basic '+basic,secure=True)
    assert replay.status_code == 400
    # Wrong audience and tampered signatures must still be rejected.
    try:
        jwt.decode(tokens['access_token'],key.public_key,algorithms=[provider.jwt_key[1]],audience='wrong')
        raise AssertionError('wrong audience accepted')
    except jwt.InvalidAudienceError: pass
    parts=tokens['access_token'].split('.');parts[2]=('A' if parts[2][0]!='A' else 'B')+parts[2][1:]
    try:
        jwt.decode('.'.join(parts),key.public_key,algorithms=[provider.jwt_key[1]],audience=provider.client_id)
        raise AssertionError('tampered signature accepted')
    except jwt.InvalidSignatureError: pass
    app.delete();provider.delete();key.delete()
user.delete()
print('UTILIBRE_NATIVE_AUTH_PASSED: owner assertion; synthetic password/TOTP replay protection; RSA/ECDSA OAuth code exchange, JWKS, audience/signature/code-replay rejection; no external network.')

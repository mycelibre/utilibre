"""Synthetic host-library checks. No credentials, network or persisted tokens."""
import json
import time
from types import SimpleNamespace
from urllib.parse import parse_qs

import cloudinit
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from oauthlib.common import generate_signed_token, verify_signed_token
from oauthlib.oauth2 import ServiceApplicationClient

assert jwt.__version__ == '2.15.1'
claims = {'sub': 'synthetic-user', 'exp': int(time.time()) + 120}
secret = b'Synthetic-only-key-no-real-credential-' * 2
token = jwt.encode(claims, secret, algorithm='HS256')
assert jwt.decode(token, secret, algorithms=['HS256']) == claims

def denied(fn, error=jwt.InvalidTokenError):
    try:
        fn()
    except error:
        return
    raise AssertionError('Expected native denial')

denied(lambda: jwt.decode(token, b'wrong-synthetic-key-' * 4, algorithms=['HS256']))
denied(lambda: jwt.decode(token, secret, algorithms=['RS256']))
expired = jwt.encode({'sub': 'synthetic', 'exp': 1}, secret, algorithm='HS256')
denied(lambda: jwt.decode(expired, secret, algorithms=['HS256']))
denied(lambda: jwt.PyJWK.from_dict({'kty': 'oct', 'k': '', 'alg': 'HS256'}), jwt.InvalidKeyError)
denied(lambda: jwt.encode(claims, b'', algorithm='HS256'), jwt.InvalidKeyError)

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
private = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
public = key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
request = SimpleNamespace(scope='synthetic-check', expires_in=120, claims={'sub': 'synthetic-user'})
signed = generate_signed_token(private, request)
assert verify_signed_token(public, signed)['scope'] == 'synthetic-check'
client = ServiceApplicationClient('synthetic-client', private_key=private,
    issuer='synthetic-issuer', subject='synthetic-user', audience='https://example.invalid/token')
body = parse_qs(client.prepare_request_body())
assert jwt.decode(body['assertion'][0], public, algorithms=['RS256'], audience='https://example.invalid/token')['iss'] == 'synthetic-issuer'
for algorithm, private_key in [('RS256', key), ('PS256', key), ('ES256', ec.generate_private_key(ec.SECP256R1()))]:
    signed = jwt.encode(claims, private_key, algorithm=algorithm)
    assert jwt.decode(signed, private_key.public_key(), algorithms=[algorithm]) == claims
print(json.dumps({'passed': True, 'version': jwt.__version__, 'nativeOAuthlib': True,
    'cloudInitImport': bool(cloudinit), 'algorithms': ['HS256', 'RS256', 'PS256', 'ES256'],
    'expiredWrongKeyAlgorithmAndEmptyKeyDenied': True, 'networkRequests': 0}))

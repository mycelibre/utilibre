"""Fictional native PyJWT/Apprise compatibility gate; no delivery or real tokens."""
import time
import jwt
import apprise
from cryptography.hazmat.primitives.asymmetric import rsa, ec

assert jwt.__version__ == '2.15.1'
claims = {'sub': 'fictional-kuma', 'exp': int(time.time()) + 120}
secret = b'Fictional-local-test-not-a-service-credential-' * 2
token = jwt.encode(claims, secret, algorithm='HS256')
assert jwt.decode(token, secret, algorithms=['HS256']) == claims

def denied(fn, exception=jwt.InvalidTokenError):
    try:
        fn()
    except exception:
        return
    raise AssertionError('Native denial missing')

denied(lambda: jwt.decode(token, b'wrong-fixture-key-' * 4, algorithms=['HS256']))
denied(lambda: jwt.decode(token, secret, algorithms=['RS256']))
denied(lambda: jwt.decode(jwt.encode({'exp': 1}, secret, algorithm='HS256'), secret, algorithms=['HS256']))
denied(lambda: jwt.encode(claims, b'', algorithm='HS256'), jwt.InvalidKeyError)
denied(lambda: jwt.PyJWK.from_dict({'kty': 'oct', 'k': '', 'alg': 'HS256'}), jwt.InvalidKeyError)
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
for algorithm, private in [('RS256', key), ('PS256', key), ('ES256', ec.generate_private_key(ec.SECP256R1()))]:
    encoded = jwt.encode(claims, private, algorithm=algorithm)
    assert jwt.decode(encoded, private.public_key(), algorithms=[algorithm]) == claims
notifications = apprise.Apprise()
assert notifications.add('json://127.0.0.1:9')
# Intentionally do not send: checking native parser/import compatibility only.
print('Native PyJWT HS/RS/PS/ES, key/algorithm/expiry denials and Apprise parser passed; no network requests.')

"""Bounded synthetic native-consumer check; no network, real keys or content."""
import base64
import json
import os
import sys
from types import SimpleNamespace

import cryptography
import jwt
import oauthlib
import apprise
from cryptography.fernet import Fernet
from cryptography.hazmat.backends.openssl.backend import backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from oauthlib.oauth1.rfc5849.signature import sign_rsa_sha256_with_client
from apprise.plugins.simplepush import NotifySimplePush
from apprise.plugins.vapid.subscription import WebPushSubscription
from apprise.utils.pem import PEM_SUPPORT

message = 'Ficción: taller comunitario'.encode()
key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
public = key.public_key()
for mechanism in [padding.PKCS1v15(), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None)]:
    encrypted = public.encrypt(message, mechanism)
    assert key.decrypt(encrypted, mechanism) == message
signature = key.sign(message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())
public.verify(signature, message, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=padding.PSS.MAX_LENGTH), hashes.SHA256())
oauth_signature = sign_rsa_sha256_with_client('fictional-signature-base', SimpleNamespace(rsa_key=pem.decode()))
public.verify(base64.b64decode(oauth_signature), b'fictional-signature-base', padding.PKCS1v15(), hashes.SHA256())
for algorithm, private in [('RS256', key), ('PS256', key), ('ES256', ec.generate_private_key(ec.SECP256R1())), ('EdDSA', ed25519.Ed25519PrivateKey.generate())]:
    token = jwt.encode({'sub': 'fictional-user'}, private, algorithm=algorithm)
    assert jwt.decode(token, private.public_key(), algorithms=[algorithm])['sub'] == 'fictional-user'
    try:
        jwt.decode(token, private.public_key(), algorithms=['HS256'])
    except jwt.InvalidAlgorithmError:
        pass
    else:
        raise AssertionError('JWT algorithm restriction not enforced')
fernet = Fernet(Fernet.generate_key())
assert fernet.decrypt(fernet.encrypt(message)) == message
aead = AESGCM(AESGCM.generate_key(bit_length=256))
nonce = os.urandom(12)
assert aead.decrypt(nonce, aead.encrypt(nonce, message, b'fictional-aad'), b'fictional-aad') == message
assert PEM_SUPPORT and NotifySimplePush.enabled
plugin = NotifySimplePush(apikey='fictional-key', user='fictional-salt', password='fictional-password')
assert plugin._encrypt('fictional notification')
ec_key = ec.generate_private_key(ec.SECP256R1())
point = ec_key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)
encode = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=').decode()
subscription = WebPushSubscription({'endpoint': 'https://example.invalid/push', 'keys': {'p256dh': encode(point), 'auth': encode(os.urandom(16))}})
assert subscription and subscription.public_key
if '--candidate' in sys.argv:
    import cffi
    import _cffi_backend
    import pycparser
    assert cryptography.__version__ == '50.0.2'
    assert backend.openssl_version_text().startswith('OpenSSL 4.0.3 ')
    assert cffi.__version__ == _cffi_backend.__version__ == '2.1.1'
    assert pycparser.__version__ == '3.11'
    ffi = cffi.FFI()
    ffi.cdef('int abs(int);')
    assert ffi.dlopen(None).abs(-12) == 12
print(json.dumps({'passed': True, 'cryptography': cryptography.__version__, 'openssl': backend.openssl_version_text(), 'oauthlib': oauthlib.__version__, 'pyjwt': jwt.__version__, 'apprise': apprise.__version__, 'checks': ['RSA PKCS1v1.5 and OAEP roundtrips', 'RSA PSS and OAuthlib RSA-SHA256', 'JWT RSA/PSS/EC/Ed25519 and algorithm restrictions', 'Fernet/AES-GCM roundtrips', 'Apprise AES-CBC and WebPush public-key loading'], 'network': 'none', 'limitation': 'Functional compatibility, not an independent timing side-channel proof'}))

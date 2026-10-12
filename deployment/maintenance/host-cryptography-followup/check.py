"""Synthetic native API, certificate-budget and consumer checks. No real keys/data."""
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
import datetime as dt
import hashlib
import http.server
import ipaddress
import json
import ssl
import tempfile
import threading
from cryptography import __version__, x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.fernet import Fernet
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID
from cryptography.x509.verification import PolicyBuilder, Store, VerificationError

mode = sys.argv[2]
assert mode in ('old', 'new') and __version__ == '43.0.0'
now = dt.datetime.now(dt.timezone.utc)
key = lambda: ec.generate_private_key(ec.SECP256R1())
name = lambda label: x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, label)])
def cert(subject, issuer, subject_key, signing_key, ca=False, sans=None, constraints=None, identifiers=True):
    b = (x509.CertificateBuilder().subject_name(subject).issuer_name(issuer)
         .public_key(subject_key.public_key()).serial_number(x509.random_serial_number())
         .not_valid_before(now-dt.timedelta(days=1)).not_valid_after(now+dt.timedelta(days=7))
         .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True)
         .add_extension(x509.KeyUsage(True, False, not ca, False, False, ca, ca, False, False), critical=True))
    if identifiers:
        b = b.add_extension(x509.SubjectKeyIdentifier.from_public_key(subject_key.public_key()), False)
        b = b.add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(signing_key.public_key()), False)
    if not ca:
        b = b.add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), False)
    if sans is not None:
        b = b.add_extension(x509.SubjectAlternativeName(sans), False)
    if constraints:
        b = b.add_extension(constraints, critical=True)
    return b.sign(signing_key, hashes.SHA256())
root_key, ca_key, leaf_key, bad_key = key(), key(), key(), key()
root_name, ca_name = name('Utilibre fictional root'), name('Utilibre fictional issuer')
root = cert(root_name, root_name, root_key, root_key, ca=True)
intermediate = cert(ca_name, root_name, ca_key, root_key, ca=True)
bad = cert(ca_name, root_name, bad_key, root_key, ca=True)
leaf = cert(name('bar.example.test'), ca_name, leaf_key, ca_key, sans=[x509.DNSName('bar.example.test')])
verifier = PolicyBuilder().store(Store([root])).time(now).build_server_verifier(x509.DNSName('bar.example.test'))
assert verifier.verify(leaf, [intermediate]) == [leaf, intermediate, root]
# An adversarial set of individually well-formed but wrong-signing-key issuers.
# A baseline has no global signature budget; the patched verifier must stop at 128.
try:
    verifier.verify(leaf, [bad] * 140)
except VerificationError as exc:
    budget_error = str(exc)
else:
    raise AssertionError('Wrong issuer unexpectedly validated')
assert ('Exceeded maximum signature check limit' in budget_error) == (mode == 'new'), budget_error
# AKI/SKI ordering keeps the real issuer reachable even behind wrong-key candidates.
assert verifier.verify(leaf, [bad]*140+[intermediate]) == [leaf, intermediate, root]
# Actual reproducer shapes for both wildcard advisories. This series is stricter:
# it rejects wildcard SANs under name constraints, before the later affected matcher.
wildcard_cases = []
for constraints in (
    x509.NameConstraints(permitted_subtrees=[x509.DNSName('foo.example.test')], excluded_subtrees=None),
    x509.NameConstraints(permitted_subtrees=None, excluded_subtrees=[x509.DNSName('bar.example.test')]),
):
    constrained = cert(ca_name, root_name, ca_key, root_key, ca=True, constraints=constraints)
    wildcard = cert(name('wildcard example'), ca_name, leaf_key, ca_key, sans=[x509.DNSName('*.example.test')])
    try:
        verifier.verify(wildcard, [constrained])
    except VerificationError as exc:
        assert 'unsatisfiable DNS name constraint: malformed SAN *.example.test' in str(exc), str(exc)
        wildcard_cases.append('rejected by existing 43.0.0 DNSName parser')
    else:
        raise AssertionError('Constrained wildcard incorrectly accepted')
# Preserve legitimate unconstrained wildcard use, rather than broadly disabling SANs.
wildcard = cert(name('wildcard example'), ca_name, leaf_key, ca_key, sans=[x509.DNSName('*.example.test')])
assert verifier.verify(wildcard, [intermediate]) == [wildcard, intermediate, root]
import OpenSSL.crypto
store = OpenSSL.crypto.X509Store()
store.add_cert(OpenSSL.crypto.X509.from_cryptography(root))
OpenSSL.crypto.X509StoreContext(store, OpenSSL.crypto.X509.from_cryptography(leaf), [OpenSSL.crypto.X509.from_cryptography(intermediate)]).verify_certificate()
import jwt
private = leaf_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
public = leaf_key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
token = jwt.encode({'sub':'fictional-synthetic-test'}, private, algorithm='ES256')
assert jwt.decode(token, public, algorithms=['ES256'])['sub'] == 'fictional-synthetic-test'
f = Fernet(Fernet.generate_key()); assert f.decrypt(f.encrypt(b'fictional data')) == b'fictional data'
import josepy
from cryptography.hazmat.primitives.asymmetric import rsa
from acme import challenges
jwk = josepy.JWKRSA(key=rsa.generate_private_key(public_exponent=65537, key_size=2048))
challenge = challenges.HTTP01(token=b'fictional-token-only')
response, validation = challenge.response_and_validation(jwk)
assert response.verify(challenge, jwk.public_key()) and isinstance(validation, str)
# A real local HTTPS request through the existing requests/PyOpenSSL consumer stack.
import requests
from urllib3.contrib import pyopenssl
server_cert = cert(name('localhost'), root_name, leaf_key, root_key,
                   sans=[x509.DNSName('localhost'),x509.IPAddress(ipaddress.ip_address('127.0.0.1'))])
class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def do_GET(self):
        assert self.path == '/synthetic'
        body=b'fictional local TLS response'
        self.send_response(200); self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
with tempfile.TemporaryDirectory(prefix='utilibre-crypto-fixture-') as tmp:
    p=Path(tmp)
    (p/'key.pem').write_bytes(private)
    (p/'server.pem').write_bytes(server_cert.public_bytes(serialization.Encoding.PEM))
    (p/'root.pem').write_bytes(root.public_bytes(serialization.Encoding.PEM))
    server=http.server.HTTPServer(('127.0.0.1',0),Handler)
    ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.load_cert_chain(p/'server.pem',p/'key.pem')
    server.socket=ctx.wrap_socket(server.socket,server_side=True)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    pyopenssl.inject_into_urllib3()
    try:
        session=requests.Session();session.trust_env=False
        r=session.get(f'https://localhost:{server.server_port}/synthetic',verify=str(p/'root.pem'),timeout=5)
        assert r.status_code==200 and r.content==b'fictional local TLS response'
        session.close()
    finally:
        pyopenssl.extract_from_urllib3();server.shutdown();server.server_close();thread.join(5)
import cryptography.hazmat.bindings._rust as rust
print(json.dumps({'mode':mode,'version':__version__,'rustSha256':hashlib.sha256(Path(rust.__file__).read_bytes()).hexdigest(),
    'budgetEnforced':mode=='new','budgetResult':budget_error,'validChainAndIssuerOrdering':True,
    'constrainedWildcardsRejected':len(wildcard_cases),'unconstrainedWildcardPreserved':True,
    'pyOpenSSLStore':True,'jwtES256':True,'fernet':True,'acmeChallenge':True,'localRequestsPyOpenSSLTLS':True,'passed':True}))

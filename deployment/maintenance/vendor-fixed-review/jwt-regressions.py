"""Synthetic PyJWT regressions; two loopback endpoints, no real tokens/data."""
import json
import platform
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import jwt
import cryptography
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa


def pem_hmac_checks():
    """CVE-2026-102268; ephemeral synthetic keys, no service authentication."""
    payload = {"sub": "fictional-local-regression"}
    secret = b"synthetic-regression-key-not-a-credential-" * 2
    assert jwt.decode(jwt.encode(payload, secret, algorithm="HS256"), secret,
                      algorithms=["HS256"]) == payload
    rejected = 0
    for algorithm, key in [("RS256", rsa.generate_private_key(public_exponent=65537, key_size=2048)),
                           ("ES256", ec.generate_private_key(ec.SECP256R1()))]:
        pem = key.public_key().public_bytes(serialization.Encoding.PEM,
                                            serialization.PublicFormat.SubjectPublicKeyInfo)
        token = jwt.encode(payload, key, algorithm=algorithm)
        assert jwt.decode(token, pem, algorithms=[algorithm]) == payload
        for variant in [pem, pem.replace(b"-----END", b"\t-----END"),
                        pem.replace(b"\n", b"\r"), pem.replace(b"\n", b"")]:
            # Prove these are real loadable public keys, not simply bad input.
            assert serialization.load_pem_public_key(variant).public_numbers() == key.public_key().public_numbers()
            assert jwt.utils.is_pem_format(variant), "PEM variant escaped recognition"
            try:
                jwt.algorithms.HMACAlgorithm(jwt.algorithms.HMACAlgorithm.SHA256).prepare_key(variant)
            except jwt.InvalidKeyError:
                rejected += 1
            else:
                raise AssertionError("Asymmetric public key accepted as HMAC secret")
    return rejected

assert jwt.__version__ == "2.15.1"
assert Path(jwt.__file__).resolve() == Path("/usr/lib/python3/dist-packages/jwt/__init__.py")
pem_rejections = pem_hmac_checks()
assert pem_rejections == 8
try:
    jwt.PyJWK.from_dict({"kty": "oct", "k": "", "alg": "HS256"})
except jwt.InvalidKeyError:
    pass
else:
    raise AssertionError("Empty JWK accepted")

counts = {"trusted": 0, "redirected": 0}

class RedirectDestination(BaseHTTPRequestHandler):
    def do_GET(self):
        counts["redirected"] += 1
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"keys": []}')

    def log_message(self, *args):
        pass

destination = ThreadingHTTPServer(("127.0.0.1", 0), RedirectDestination)

class TrustedEndpoint(BaseHTTPRequestHandler):
    def do_GET(self):
        counts["trusted"] += 1
        self.send_response(302)
        self.send_header("Location", "http://127.0.0.1:%d/untrusted" % destination.server_port)
        self.end_headers()

    def log_message(self, *args):
        pass

trusted = ThreadingHTTPServer(("127.0.0.1", 0), TrustedEndpoint)
servers = [destination, trusted]
threads = [threading.Thread(target=s.serve_forever, daemon=True) for s in servers]
for thread in threads:
    thread.start()
try:
    client = jwt.PyJWKClient("http://127.0.0.1:%d/jwks" % trusted.server_port, timeout=2)
    try:
        client.fetch_data()
    except jwt.PyJWKClientConnectionError:
        pass
    else:
        raise AssertionError("Redirect accepted")
    assert counts == {"trusted": 1, "redirected": 0}, counts
finally:
    for server in servers:
        server.shutdown()
        server.server_close()
    for thread in threads:
        thread.join(timeout=2)
print(json.dumps({"passed": True, "version": jwt.__version__, "emptyJwkDenied": True,
                  "python": platform.python_version(), "cryptography": cryptography.__version__,
                  "redirectDenied": True, "redirectTargetRequests": counts["redirected"],
                  "loopbackRequests": counts["trusted"], "externalRequests": 0,
                  "pemHmacConfusionDenied": True, "pemVariantsRejected": pem_rejections,
                  "validAlgorithmRoundTrips": 3}))

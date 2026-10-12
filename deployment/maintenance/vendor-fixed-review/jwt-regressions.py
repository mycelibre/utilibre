"""Synthetic PyJWT regressions; two loopback endpoints, no real tokens/data."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import jwt

assert jwt.__version__ == "2.15.1"
assert Path(jwt.__file__).resolve() == Path("/usr/lib/python3/dist-packages/jwt/__init__.py")
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
                  "redirectDenied": True, "redirectTargetRequests": counts["redirected"],
                  "loopbackRequests": counts["trusted"], "externalRequests": 0}))

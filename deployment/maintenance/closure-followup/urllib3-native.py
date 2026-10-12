"""Bounded fictional HTTP/TLS/proxy and chunk-parser tests, in a network-none namespace."""
import gzip
import http.client
import io
import json
import ssl
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests
import urllib3

assert urllib3.__version__ == "2.8.0"
requests.check_compatibility(urllib3.__version__, requests.chardet_version,
                             requests.charset_normalizer_version)
checks = []


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        body = b"fictional transfer"
        status = 200
        headers = {}
        if self.path == "/redirect":
            status, headers = 302, {"Location": "/"}
        elif self.path == "/gzip":
            body, headers = gzip.compress(body), {"Content-Encoding": "gzip"}
        elif self.path == "/missing":
            status = 404
        self.send_response(status)
        for name, value in headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        assert 0 < length < 1000
        assert json.loads(self.rfile.read(length)) == {"fictional": True}
        self.do_GET()


def denied(call):
    try:
        call()
    except (urllib3.exceptions.SSLError, urllib3.exceptions.MaxRetryError,
            requests.exceptions.SSLError):
        return
    except urllib3.exceptions.ProxyError as error:
        assert isinstance(error.original_error, urllib3.exceptions.SSLError)
        return
    raise AssertionError("TLS identity/trust denial missing")


fixture = Path(sys.argv[1]) if len(sys.argv) == 2 else Path("/fixture")
certificate = str(fixture / "cert.pem")
key = str(fixture / "key.pem")
servers = [ThreadingHTTPServer(("127.0.0.1", 0), Handler) for _ in range(2)]
server_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
server_context.load_cert_chain(certificate, key)
servers[1].socket = server_context.wrap_socket(servers[1].socket, server_side=True)
for server in servers:
    threading.Thread(target=server.serve_forever, daemon=True).start()
plain = "http://localhost:" + str(servers[0].server_port)
secure = "https://localhost:" + str(servers[1].server_port)
pool = urllib3.PoolManager(timeout=2, retries=False, ca_certs=certificate)
session = requests.Session()
session.trust_env = False
try:
    for suffix in ["/", "/redirect", "/gzip"]:
        assert pool.request("GET", plain + suffix).data == b"fictional transfer"
        assert session.get(plain + suffix, timeout=2).content == b"fictional transfer"
        checks.append("urllib3+requests " + suffix)
    assert session.post(plain, json={"fictional": True}, timeout=2).status_code == 200
    assert pool.request("GET", plain + "/missing").status == 404
    assert pool.request("GET", secure).data == b"fictional transfer"
    assert session.get(secure, verify=certificate, timeout=2).status_code == 200
    denied(lambda: urllib3.PoolManager(timeout=2, retries=False).request("GET", secure))
    denied(lambda: urllib3.PoolManager(timeout=2, retries=False, ca_certs=certificate,
                                      assert_hostname="wrong.invalid").request("GET", secure))
    checks += ["POST", "404", "trusted TLS", "untrusted TLS denied", "wrong identity denied"]
    # Native forwarding-proxy mode: target CA/identity settings must not
    # replace the explicitly configured proxy's own TLS trust/identity.
    proxy = urllib3.ProxyManager(secure, timeout=2, retries=False,
        use_forwarding_for_https=True, proxy_ssl_context=ssl.create_default_context(cafile=certificate),
        ssl_context=ssl.create_default_context(), assert_hostname="target.invalid")
    assert proxy.request("GET", "https://target.invalid/").data == b"fictional transfer"
    proxy.clear()
    wrong_proxy = urllib3.ProxyManager(secure, timeout=2, retries=False,
        use_forwarding_for_https=True, proxy_ssl_context=ssl.create_default_context(cafile=certificate),
        proxy_assert_hostname="wrong.invalid", assert_hostname="localhost")
    denied(lambda: wrong_proxy.request("GET", "https://target.invalid/"))
    wrong_proxy.clear()
    checks += ["proxy CA independent of destination", "proxy identity cannot be overridden by destination"]

    class BoundedReader(io.BytesIO):
        def readline(self, limit=-1):
            assert 0 < limit <= 65537, "unbounded chunk-header read"
            return super().readline(limit)

    # Upstream's test_chunk_size_line_too_long shape; no remote input/DoS.
    raw = http.client.HTTPResponse(type("Sock", (), {"makefile": lambda *_a, **_kw: io.BytesIO()})())
    raw.fp = BoundedReader(b"F" * 65538)
    raw.chunked, raw.chunk_left = True, None
    response = urllib3.response.HTTPResponse(raw, preload_content=False,
        headers={"transfer-encoding": "chunked"})
    try:
        next(response.read_chunked())
    except urllib3.exceptions.ProtocolError as error:
        assert "chunk size line exceeded maximum allowed length" in str(error)
    else:
        raise AssertionError("oversized chunk header accepted")
    checks.append("bounded chunk-header rejection")
finally:
    pool.clear()
    session.close()
    for server in servers:
        server.shutdown()
        server.server_close()
print(json.dumps({"passed": True, "urllib3": urllib3.__version__, "requests": requests.__version__,
    "checks": checks, "network": "loopback-only synthetic fixture; no notifications or external requests"}))

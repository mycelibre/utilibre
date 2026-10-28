"""Synthetic local-only HTTP/TLS peer; no logging, private content or egress."""
import gzip
import http.server
import ssl
import threading
from pathlib import Path

class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *args):
        pass
    def do_GET(self):
        body = b"fictional transfer\n"
        if self.path == "/redirect":
            self.send_response(302)
            self.send_header("Location", "/")
            body = b""
        else:
            self.send_response(404 if self.path == "/missing" else 200)
            if self.path == "/missing":
                body = b"missing"
            if self.path == "/gzip":
                body = gzip.compress(body)
                self.send_header("Content-Encoding", "gzip")
            if self.path in ("/brotli", "/bad-brotli"):
                body = Path("/fixture/" + ("body.br" if self.path == "/brotli" else "invalid.br")).read_bytes()
                self.send_header("Content-Encoding", "br")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def do_POST(self):
        size = int(self.headers.get("Content-Length", "0"))
        if not 0 <= size <= 1024:
            self.send_error(413)
            return
        body = self.rfile.read(size)
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

plain = http.server.ThreadingHTTPServer(("127.0.0.1", 18080), Handler)
tls = http.server.ThreadingHTTPServer(("127.0.0.1", 18443), Handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain("/fixture/cert.pem", "/fixture/key.pem")
tls.socket = context.wrap_socket(tls.socket, server_side=True)
threading.Thread(target=plain.serve_forever, daemon=True).start()
tls.serve_forever()

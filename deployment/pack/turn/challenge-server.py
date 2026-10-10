"""Serve only ACME HTTP-01 tokens to the private Caddy edge, without access logs."""
import http.server
import pathlib
import re

ROOT = pathlib.Path('/var/lib/utilibre-turn-acme/webroot/.well-known/acme-challenge')


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_GET(self):
        match = re.fullmatch(r'/\.well-known/acme-challenge/([A-Za-z0-9_-]{1,128})', self.path)
        if self.client_address[0] not in ('10.10.1.3', '10.10.1.43') or not match:
            self.send_error(404)
            return
        token = ROOT / match[1]
        try:
            if token.is_symlink():
                raise FileNotFoundError()
            data = token.read_bytes()
            if len(data) > 4096:
                raise FileNotFoundError()
        except FileNotFoundError:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)


http.server.ThreadingHTTPServer(('10.10.1.43', 3189), Handler).serve_forever()

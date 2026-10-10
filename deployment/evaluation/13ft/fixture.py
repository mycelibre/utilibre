"""Owned fictional fixture only. No requests to the internet or production data."""
import gzip
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ARTICLE = b'''<!doctype html><html><head><title>Fictional article</title>
<meta http-equiv="refresh" content="0;url=https://refresh.example.invalid/">
<script>window.utilibreFixtureExecuted = true;</script>
<script src="https://track.example.invalid/tag.js"></script>
<link rel="stylesheet" href="https://style.example.invalid/style.css"></head>
<body><article><h1>Fictional rivers study</h1><p>Fictional local fixture only.</p></article>
<img src="https://pixel.example.invalid/pixel.png"><iframe src="https://frame.example.invalid/"></iframe>
<form action="https://form.example.invalid/"><input name="fictional"></form></body></html>'''

class Fixture(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/redirect':
            self.send_response(302)
            self.send_header('Location', 'http://127.0.0.1:5000/')
            self.end_headers()
            return
        if self.path == '/challenge':
            self.send_response(403)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        if self.path == '/compressed':
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        try:
            if self.path == '/drip':
                for _ in range(32):
                    self.wfile.write(b'x')
                    self.wfile.flush()
                    time.sleep(1)
            elif self.path == '/large':
                self.wfile.write(b'x' * (1024 * 1024 + 1))
            elif self.path == '/compressed':
                self.wfile.write(gzip.compress(b'x' * (1024 * 1024 + 1)))
            else:
                self.wfile.write(ARTICLE)
        except (BrokenPipeError, ConnectionResetError):
            pass
    def log_message(self, *_):
        pass

ThreadingHTTPServer(('0.0.0.0', 8081), Fixture).serve_forever()

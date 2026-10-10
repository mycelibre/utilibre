#!/usr/bin/env python3
"""Offline review of pinned upstream behavior; never a public fetch server.

Run only in a fresh network namespace with loopback enabled (README below).
The only real fetch target is an ephemeral fictional fixture in that namespace.
"""
import importlib.util
import json
import os
from pathlib import Path
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

source = Path(sys.argv[1])
report = Path(sys.argv[2])
assert source.name == '13ft'
assert os.environ.get('UTILIBRE_OFFLINE_13FT_CHECK') == '1'
# A private namespace must have no default route; do not run on the VM network.
assert not any(row.split()[1] == '00000000' for row in Path('/proc/net/route').read_text().splitlines()[1:])
report.mkdir(parents=True, exist_ok=True, mode=0o700)
for name in ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']:
    os.environ.pop(name, None)
os.environ['NO_PROXY'] = '*'
spec = importlib.util.spec_from_file_location('thirteenft', source / 'app/portable.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
fixture = '''<!doctype html><html><head><title>Fictional article</title>
<link rel="stylesheet" href="https://style.example.invalid/site.css">
<script>window.utilibreFixtureExecuted = true;</script>
<script src="https://track.example.invalid/tag.js"></script></head><body>
<article><h1>Fictional rivers study</h1><p>No real article or user data.</p></article>
<img src="https://pixel.example.invalid/pixel.png" alt="fictional pixel">
<iframe src="https://frame.example.invalid/embed"></iframe>
<form action="https://form.example.invalid/submit"><input name="fictional"></form>
</body></html>'''
requests_seen = []
class Fixture(BaseHTTPRequestHandler):
    def do_GET(self):
        requests_seen.append(self.path)
        if self.path == '/redirect':
            self.send_response(302)
            self.send_header('Location', f'http://127.0.0.1:{self.server.server_port}/article')
            self.end_headers()
        else:
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(fixture.encode())
    def log_message(self, *_):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), Fixture)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
checks = []
try:
    client = app.app.test_client()
    url = f'http://127.0.0.1:{server.server_port}/article'
    response = client.post('/article', data={'link': url})
    assert response.status_code == 200 and b'Fictional rivers study' in response.data
    checks.append({'finding': 'Loopback target accepted by native application', 'verified': True})
    response = client.post('/article', data={'link': url.replace('/article', '/redirect')})
    assert response.status_code == 200 and requests_seen[-2:] == ['/redirect', '/article']
    checks.append({'finding': 'HTTP redirect to loopback followed without destination rejection', 'verified': True})
    output = response.get_data(as_text=True)
    for marker in ['utilibreFixtureExecuted', 'track.example.invalid', 'pixel.example.invalid', 'frame.example.invalid', 'form.example.invalid', 'style.example.invalid']:
        assert marker in output
    assert 'Content-Security-Policy' not in response.headers
    (report / 'fictional-rendered.html').write_text(output)
    checks.append({'finding': 'Scripts, remote resources, iframe and form retained; no native CSP', 'verified': True})
    # Read path bypasses TTL until a successful background fetch performs cleanup.
    stale = time.time() - app.PAGE_CACHE_TTL - 3600
    app.page_cache['https://fictional.example.invalid/article'] = {'html': '<p>STALE FICTIONAL ARTICLE</p>', 'timestamp': stale}
    with patch.object(app.requests, 'get', side_effect=AssertionError('Unexpected fetch')):
        response = client.get('/https://fictional.example.invalid/article')
    assert response.status_code == 200 and b'STALE FICTIONAL ARTICLE' in response.data
    checks.append({'finding': 'Cache read serves entry beyond the declared 300-second TTL', 'verified': True})
    assert 'https://fonts.googleapis.com/' in client.get('/').get_data(as_text=True)
    checks.append({'finding': 'Homepage includes Google Fonts request', 'verified': True})
    # Record fallback destinations without any real external networking.
    calls = []
    class DummyResponse:
        status_code = 404
        text = ''
        apparent_encoding = 'utf-8'
        url = 'https://archive.org/fixture'
        def json(self): return {}
    def fake_get(url, **kwargs):
        calls.append({'url': url, 'queryKeys': sorted(kwargs.get('params', {}).keys())})
        return DummyResponse()
    with patch.object(app.requests, 'get', side_effect=fake_get):
        app.fetch_via_freedium('https://medium.com/fictional-example')
        app.fetch_via_archive_org('https://fictional.example.invalid/article')
        app.fetch_via_archive_ph('https://fictional.example.invalid/article')
    assert len(calls) == 7
    checks.append({'finding': 'Hard-coded third-party fallback destinations receive requested article URLs', 'verified': True, 'fictionalCalls': calls})
    result = {'revision': 'd03b120c41d2558d3ce2a45e049ccbea8785ff7a', 'network': 'fresh namespace; loopback-only fictional server; external provider calls mocked', 'checks': checks}
    (report / 'native-results.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'checks': len(checks), 'allVerified': True, 'externalNetworkRequests': 0}))
finally:
    server.shutdown()
    server.server_close()
    app.page_cache.clear()
    app.jobs.clear()

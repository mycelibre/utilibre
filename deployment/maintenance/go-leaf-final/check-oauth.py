"""Native OIDC authorization-code/cookie regression with a loopback-only issuer.

Generated credentials and keys exist only in memory. No real identity service,
production user, application data or external provider is contacted.
"""
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import secrets
import subprocess
import threading
import time
import sys
from urllib.parse import parse_qs, urlencode, urlparse

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
import requests

ROOT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output')
IMAGE = 'utilibre-oauth2-proxy:7.15.5-go-security-20261011'
assert all(a=='--oct28' for a in sys.argv[1:])
if '--oct28' in sys.argv:
    ROOT = Path('/var/lib/utilibre-maintenance/security-20261028/go-leaf/output')
    IMAGE = 'utilibre-oauth2-proxy:go-security-20261028'
NAME = 'maintenance-oauth-native'
BASE = 'http://127.0.0.1:33142'
private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
public = private.public_key().public_numbers()
def integer(value):
    return base64.urlsafe_b64encode(value.to_bytes((value.bit_length()+7)//8, 'big')).rstrip(b'=').decode()
pending = {}
calls = []
class Issuer(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass
    def json(self, value):
        data = json.dumps(value).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def do_GET(self):
        path = urlparse(self.path)
        calls.append(path.path)
        if path.path == '/.well-known/openid-configuration':
            self.json({'issuer': issuer, 'authorization_endpoint': issuer+'/authorize',
                       'token_endpoint': issuer+'/token', 'jwks_uri': issuer+'/jwks',
                       'response_types_supported': ['code'], 'subject_types_supported': ['public'],
                       'id_token_signing_alg_values_supported': ['RS256']})
        elif path.path == '/jwks':
            self.json({'keys': [{'kty': 'RSA', 'kid': 'synthetic', 'use': 'sig',
                                'alg': 'RS256', 'n': integer(public.n), 'e': integer(public.e)}]})
        elif path.path == '/authorize':
            query = parse_qs(path.query)
            assert query['client_id'] == ['synthetic-client']
            assert query['redirect_uri'] == [BASE+'/oauth2/callback']
            code = secrets.token_urlsafe(24)
            assert query['code_challenge_method'] == ['S256']
            pending[code] = (query.get('nonce', [''])[0], query['code_challenge'][0])
            self.send_response(302)
            self.send_header('Location', BASE+'/oauth2/callback?'+urlencode({'code': code, 'state': query['state'][0]}))
            self.end_headers()
        else:
            self.send_error(404)
    def do_POST(self):
        assert self.path == '/token'
        calls.append('/token')
        query = parse_qs(self.rfile.read(int(self.headers['Content-Length'])).decode())
        nonce, challenge = pending.pop(query['code'][0])
        assert base64.urlsafe_b64encode(hashlib.sha256(query['code_verifier'][0].encode()).digest()).rstrip(b'=').decode() == challenge
        now = int(time.time())
        token = jwt.encode({'iss': issuer, 'sub': 'synthetic-user', 'aud': 'synthetic-client',
                            'iat': now, 'exp': now+300, 'nonce': nonce,
                            'email': 'fixture@example.invalid', 'email_verified': True},
                           private, algorithm='RS256', headers={'kid': 'synthetic'})
        self.json({'access_token': 'synthetic-only', 'id_token': token,
                   'token_type': 'Bearer', 'expires_in': 300})

server = ThreadingHTTPServer(('127.0.0.1', 0), Issuer)
issuer = 'http://127.0.0.1:'+str(server.server_port)
threading.Thread(target=server.serve_forever, daemon=True).start()
def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE).strip()
try:
    docker('run', '-d', '--name', NAME, '--network', 'host', '--read-only',
           '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--log-driver', 'none',
           '--memory', '128m', '--cpus', '.5', IMAGE, '--http-address=127.0.0.1:33142',
           '--provider=oidc', '--oidc-issuer-url='+issuer, '--client-id=synthetic-client',
           '--client-secret='+secrets.token_urlsafe(24), '--cookie-secret='+base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
           '--redirect-url='+BASE+'/oauth2/callback', '--cookie-secure=false',
           '--email-domain=example.invalid', '--upstream=static://200', '--set-xauthrequest=true',
           '--skip-provider-button=true', '--request-logging=false', '--auth-logging=false',
           '--standard-logging=false', '--code-challenge-method=S256')
    for _ in range(60):
        try:
            if requests.get(BASE+'/ping', timeout=1).status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(.2)
    else:
        raise AssertionError('Native OAuth proxy did not start')
    assert requests.get(BASE+'/oauth2/auth', timeout=5).status_code == 401
    session = requests.Session()
    response = session.get(BASE+'/oauth2/start?rd=/', timeout=10)
    assert response.status_code == 200, 'Native code exchange failed'
    auth = session.get(BASE+'/oauth2/auth', timeout=5)
    assert auth.status_code == 202
    assert auth.headers['X-Auth-Request-Email'] == 'fixture@example.invalid'
    # Upstream deliberately returns 500 for structurally malformed state. Use
    # syntactically valid but forged state to exercise the actual CSRF gate.
    denied=requests.get(BASE+'/oauth2/callback', params={'code':'invalid','state':'forged:/'}, timeout=5)
    assert denied.status_code == 403, ('forged CSRF rejection',denied.status_code)
    session.get(BASE+'/oauth2/sign_out', allow_redirects=False, timeout=5)
    assert session.get(BASE+'/oauth2/auth', timeout=5).status_code == 401
    assert {'/.well-known/openid-configuration', '/jwks', '/authorize', '/token'} <= set(calls)
    report = {'passed': True, 'image': IMAGE, 'imageId': docker('image', 'inspect', IMAGE, '--format', '{{.Id}}'),
              'nativeDiscoveryAuthorizationCodePkceAndSignedIdToken': True,
              'authenticatedCookieAndIdentityHeader': True, 'invalidCsrfRejected': True,
              'anonymousDeniedAndLogoutCleared': True, 'onlyLoopbackIssuer': True,
              'realProductionIdentityProvider': 'not exercised by this isolated test'}
    (ROOT/'oauth2-proxy-native.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps(report))
finally:
    server.shutdown()
    try:
        docker('rm', '-f', NAME)
    except subprocess.CalledProcessError:
        pass

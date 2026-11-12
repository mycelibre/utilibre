"""Two fictional browser OIDC logins inside a network-none namespace.

The tiny provider is test infrastructure, never a deployment/auth component.
It accepts exactly two synthetic users and serves only local discovery/tokens.
"""
import argparse
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.parse import parse_qs, urlencode, urlsplit
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
import yaml

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
IMAGE = 'sha256:12c860da57e1d354d3a75f01ec6b88acb35ea3a38b213a1b9ecab339d59aa243'
HELPER = 'sha256:942720fe0171599572cc00a947269179ed3eb7f0cfa5591dbb621766df35022b'
ISSUER = 'http://127.0.0.1:8765'


def provider():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public = key.public_key().public_numbers()
    encode = lambda number: base64.urlsafe_b64encode(number.to_bytes((number.bit_length() + 7) // 8, 'big')).decode().rstrip('=')
    jwk = {'kty': 'RSA', 'kid': 'synthetic-only', 'use': 'sig', 'alg': 'RS256', 'n': encode(public.n), 'e': encode(public.e)}

    class Handler(BaseHTTPRequestHandler):
        users = 0

        def log_message(self, *args):
            pass

        def reply(self, data, status=200):
            payload = json.dumps(data).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            path = urlsplit(self.path)
            if path.path == '/.well-known/openid-configuration':
                self.reply({'issuer': ISSUER, 'authorization_endpoint': ISSUER + '/authorize',
                    'token_endpoint': ISSUER + '/token', 'jwks_uri': ISSUER + '/keys',
                    'userinfo_endpoint': ISSUER + '/userinfo',
                    'response_types_supported': ['code'], 'subject_types_supported': ['public'],
                    'id_token_signing_alg_values_supported': ['RS256']})
            elif path.path == '/keys':
                self.reply({'keys': [jwk]})
            elif path.path == '/userinfo':
                code = self.headers.get('Authorization', '').removeprefix('Bearer ')
                assert code in ['fictional-1', 'fictional-2']
                self.reply({'sub':code, 'email':code+'@example.invalid', 'email_verified':True,
                    'preferred_username':code, 'name':'Fictional User '+code[-1]})
            elif path.path == '/authorize':
                query = parse_qs(path.query)
                redirect = query.get('redirect_uri', [''])[0]
                assert redirect.startswith('http://127.0.0.1:3456/auth/openid/')
                assert query['client_id'] == ['fixture-client']
                Handler.users += 1
                assert Handler.users <= 2
                self.send_response(302)
                self.send_header('Location', redirect + '?' + urlencode({'code': 'fictional-' + str(Handler.users), 'state': query['state'][0]}))
                self.end_headers()
            else:
                self.reply({}, 404)

        def do_POST(self):
            assert self.path == '/token'
            size = int(self.headers.get('Content-Length', '0'))
            assert 0 < size <= 4096
            body = parse_qs(self.rfile.read(size).decode())
            code = body['code'][0]
            assert code in ['fictional-1', 'fictional-2']
            now = int(time.time())
            token = jwt.encode({'iss': ISSUER, 'aud': 'fixture-client', 'sub': code,
                'iat': now, 'exp': now + 300, 'email': code + '@example.invalid',
                'email_verified': True, 'preferred_username': code, 'name': 'Fictional User ' + code[-1]}, key,
                algorithm='RS256', headers={'kid': 'synthetic-only'})
            self.reply({'access_token': code, 'token_type': 'Bearer', 'expires_in': 300, 'id_token': token})

    ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    options = parser.parse_args()
    assert options.output.is_absolute() and not options.output.exists()
    os.umask(0o077)
    directory = Path(tempfile.mkdtemp(prefix='utilibre-vikunja-oidc-', dir='/dev/shm'))
    helper = 'maintenance-vikunja-oidc-net-' + str(os.getpid())
    name = 'maintenance-vikunja-oidc-' + str(os.getpid())
    processes = []
    diagnostic = tempfile.TemporaryFile(dir='/dev/shm')
    run = lambda args: subprocess.check_output(args, text=True, stderr=subprocess.PIPE).strip()
    try:
        directory.chmod(0o755)
        data = directory / 'data'
        data.mkdir()
        os.chown(data, 1000, 1000)
        fixture = yaml.safe_load((REPO / 'deployment/community/vikunja/config.yml').read_text())
        fixture['auth'] = {'local': {'enabled': False}, 'openid': {'enabled': True, 'providers': {
            'utilibre': {'name': 'Utilibre fixture', 'authurl': ISSUER, 'clientid': 'fixture-client',
                'clientsecret': 'fictional-only', 'scope': 'openid email profile',
                'emailfallback': False, 'usernamefallback': False}}}}
        fixture['service'].update(publicurl='http://127.0.0.1:3456/', enableregistration=False,
                                  secret='Fictional-isolated-native-test-not-a-real-secret-593')
        fixture['avatar']['gravatarbaseurl'] = 'http://127.0.0.1:9/unavailable'
        config = directory / 'config.yml'
        config.write_text(yaml.safe_dump(fixture))
        config.chmod(0o644)
        run(['docker', 'run', '-d', '--name', helper, '--network', 'none', '--read-only',
             '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '64m',
             '--cpus', '.25', '--pids-limit', '32', '--log-driver', 'none', HELPER, 'sleep', '420'])
        info = json.loads(run(['docker', 'inspect', helper]))[0]
        namespace = ['nsenter', '-t', str(info['State']['Pid']), '-n']
        processes.append(subprocess.Popen(namespace + [sys.executable, str(Path(__file__).resolve()), '--provider'],
                                          stdout=diagnostic, stderr=diagnostic))
        time.sleep(.5)
        run(['docker', 'run', '-d', '--name', name, '--network', 'container:' + helper, '--read-only',
             '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
             '--log-driver', 'none', '--cpus', '1', '--memory', '512m', '--pids-limit', '128',
             '-e', 'VIKUNJA_DATABASE_PATH=/data/vikunja.db', '--tmpfs', '/tmp:rw,size=32m,mode=1777',
             '-v', str(config) + ':/app/vikunja/config.yml:ro', '-v', str(data) + ':/data', IMAGE])
        processes.append(subprocess.Popen(['docker','attach','--sig-proxy=false',name],
                                          stdout=diagnostic,stderr=diagnostic))
        result = subprocess.run(namespace + ['/root/.nvm/versions/node/v24.22.3/bin/node',
            str(HERE / 'check-browser.mjs'), str(options.output)], capture_output=True, text=True, timeout=180)
        if result.returncode:
            diagnostic.seek(0)
            raise RuntimeError(result.stderr[-2500:] + diagnostic.read().decode()[-1800:])
        print('Two synthetic OIDC browser sessions passed; no external route available.')
    finally:
        for process in processes:
            process.terminate()
        for container in [name, helper]:
            subprocess.run(['docker', 'rm', '-f', '-v', container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for process in processes:
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=5)
        shutil.rmtree(directory)
        diagnostic.close()


if __name__ == '__main__':
    if '--provider' in sys.argv:
        provider()
    else:
        main()

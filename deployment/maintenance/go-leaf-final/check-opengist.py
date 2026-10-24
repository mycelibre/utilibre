"""Two fictional native accounts, RAM-only SQLite and private HTTP Git.

No production mount, identity provider or credentials. The fixture network is
internal-only; reports contain booleans/image identity, never session tokens.
"""
import base64
import argparse
from datetime import date, timedelta
import io
import ipaddress
import json
import os
from pathlib import Path
import re
import secrets
import subprocess
import sys
import tempfile
import time
import zipfile

import requests

os.umask(0o077)
parser = argparse.ArgumentParser()
parser.add_argument('--old', action='store_true')
parser.add_argument('--image-id')
parser.add_argument('--output')
options = parser.parse_args()
assert not (options.old and options.image_id)
if options.image_id:
    assert re.fullmatch(r'sha256:[a-f0-9]{64}', options.image_id)
    assert options.output and Path(options.output).is_absolute()
BASELINE = options.old
IMAGE = ('sha256:abd991c0904ccf14825d48ece22a203a9df41fbbc8b58236831a287d3f1ad448'
         if BASELINE else 'utilibre-opengist:1.15.2-go-security-20261011')
IMAGE = options.image_id or IMAGE
NAME = 'maintenance-opengist-go-native'
NETWORK = 'maintenance-opengist-go-native'
SUBNET = '172.29.242.0/28'
BASE = 'http://172.29.242.2:6157'
HERE = Path(__file__).resolve().parent
OUT = Path('/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/' +
           ('opengist-old-native.json' if BASELINE else 'opengist-native.json'))
OUT = Path(options.output) if options.output else OUT


def docker(*args):
    return subprocess.check_output(['docker', *args], text=True, stderr=subprocess.PIPE).strip()


def csrf(text):
    found = re.search(r'name="_csrf"[^>]*value="([^"]+)"', text)
    if not found:
        found = re.search(r'value="([^"]+)"[^>]*name="_csrf"', text)
    assert found, 'Native CSRF field missing'
    return found.group(1)


def request(session, method, path, **kwargs):
    # Test-only HTTP inside the isolated network, not a production cookie change.
    for cookie in session.cookies:
        cookie.secure = False
    session.trust_env = False
    return session.request(method, BASE + path, timeout=15, **kwargs)


def account(username):
    session = requests.Session()
    password = secrets.token_urlsafe(24)
    page = request(session, 'GET', '/-/register')
    response = request(session, 'POST', '/-/register', data={'username': username,
        'password': password, '_csrf': csrf(page.text)}, allow_redirects=False)
    assert response.status_code == 302, 'Native registration failed'
    page = request(session, 'GET', '/-/settings/access-tokens')
    response = request(session, 'POST', '/-/settings/access-tokens', data={
        'name': 'Fictional compiler verification', 'scope_gist': '2', 'scope_user': '2',
        'expires_at': str(date.today() + timedelta(days=1)), '_csrf': csrf(page.text)},
        allow_redirects=False)
    assert response.status_code == 302
    token = re.search(r'og_[A-Za-z0-9_-]+', request(session, 'GET', '/-/settings/access-tokens').text)
    assert token, 'Native token creation failed'
    return {'session': session, 'username': username, 'password': password, 'token': token.group(0)}


def api(user, method, path, body=None, status=200):
    session = requests.Session()
    headers = {'Authorization': 'Bearer ' + user['token']} if user else {}
    response = request(session, method, '/api' + path, json=body, headers=headers)
    assert response.status_code == status, (method, path, response.status_code)
    return response


def git(user, *args, cwd=None, success=True):
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update({'GIT_TERMINAL_PROMPT': '0', 'GIT_CONFIG_NOSYSTEM': '1',
                'GIT_CONFIG_GLOBAL': '/dev/null', 'GIT_CONFIG_COUNT': '1',
                'GIT_CONFIG_KEY_0': 'credential.helper', 'GIT_CONFIG_VALUE_0': ''})
    if user:
        auth = base64.b64encode((user['username'] + ':' + user['token']).encode()).decode()
        env.update({'GIT_CONFIG_COUNT': '2', 'GIT_CONFIG_KEY_1': 'http.extraHeader',
                    'GIT_CONFIG_VALUE_1': 'Authorization: Basic ' + auth})
    result = subprocess.run(['git', *args], cwd=cwd, env=env, text=True,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
    assert (result.returncode == 0) == success, 'Native Git result differed from the expected authorization'
    return result.stdout


created = False
network_created = False
try:
    assert not docker('ps', '-aq', '--filter', 'name=^/' + NAME + '$')
    ids = docker('network', 'ls', '-q').split()
    for network in json.loads(docker('network', 'inspect', *ids)):
        for entry in network.get('IPAM', {}).get('Config') or []:
            if entry.get('Subnet'):
                assigned = ipaddress.ip_network(entry['Subnet'])
                assert assigned.version != 4 or not assigned.overlaps(ipaddress.ip_network(SUBNET)), 'Fixture subnet in use'
    docker('network', 'create', '--internal', '--subnet', SUBNET, NETWORK)
    network_created = True
    docker('run', '-d', '--name', NAME, '--network', NETWORK, '--ip', '172.29.242.2',
        '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges:true', '--memory', '512m', '--cpus', '1',
        '--pids-limit', '128', '--log-driver', 'none', '--tmpfs', '/tmp:rw,size=32m,mode=1777',
        '--tmpfs', '/opengist:rw,size=96m,uid=1000,gid=1000',
        '-v', str(HERE.parent / 'opengist-stage.yml') + ':/config.yml:ro',
        '-e', 'OG_EXTERNAL_URL=' + BASE, IMAGE)
    created = True
    anonymous = requests.Session()
    for _ in range(60):
        try:
            if request(anonymous, 'GET', '/healthcheck').status_code == 200:
                break
        except requests.RequestException:
            pass
        time.sleep(.5)
    else:
        raise AssertionError('Native Opengist startup failed')
    owner = account('fictional-owner')
    page = request(owner['session'], 'GET', '/-/admin-panel/configuration')
    response = request(owner['session'], 'PUT', '/-/admin-panel/set-config', data={
        'key': 'disable-gravatar', 'value': '1', '_csrf': csrf(page.text)})
    assert response.status_code == 200
    other = account('fictional-other')
    gists = []
    for visibility in ['public', 'private']:
        gist = api(owner, 'POST', '/gists', {'title': 'Fictional compiler check',
            'visibility': visibility, 'files': {'example.txt': {'content': 'Fictional one\n'}}}, 201).json()
        ident = gist['id']
        gists.append(ident)
        for user in [None, other]:
            api(user, 'GET', '/gists/' + ident, status=404 if visibility == 'private' else 200)
        api(owner, 'PATCH', '/gists/' + ident, {'files': {'example.txt': {'content': 'Fictional two\n'}}})
        assert len(api(owner, 'GET', '/gists/' + ident + '/commits').json()) >= 2
        archive = request(owner['session'], 'GET', '/fictional-owner/' + ident + '/archive/HEAD')
        assert archive.status_code == 200
        with zipfile.ZipFile(io.BytesIO(archive.content)) as contents:
            filename = next(n for n in contents.namelist() if n.endswith('example.txt'))
            assert contents.read(filename) == b'Fictional two\n'
        if visibility == 'private':
            url = BASE + '/fictional-owner/' + ident
            for user in [None, other]:
                git(user, 'ls-remote', url, success=False)
            with tempfile.TemporaryDirectory(prefix='opengist-native-', dir='/run') as temp:
                repo = Path(temp) / 'repo'
                git(owner, 'clone', '--quiet', url, str(repo))
                assert (repo / 'example.txt').read_text() == 'Fictional two\n'
                (repo / 'example.txt').write_text('Fictional Git roundtrip\n')
                git(owner, 'add', 'example.txt', cwd=repo)
                git(owner, '-c', 'user.name=Fictional fixture', '-c', 'user.email=fixture@example.invalid',
                    'commit', '--quiet', '-m', 'Fictional native test', cwd=repo)
                git(owner, 'push', '--quiet', 'origin', 'HEAD', cwd=repo)
                actual = api(owner, 'GET', '/gists/' + ident).json()
                assert actual['files']['example.txt']['content'] == 'Fictional Git roundtrip\n'
                reopened = Path(temp) / 'reopened'
                git(owner, 'clone', '--quiet', url, str(reopened))
                assert (reopened / 'example.txt').read_text() == 'Fictional Git roundtrip\n'
    for ident in gists:
        api(owner, 'DELETE', '/gists/' + ident, status=204)
        api(owner, 'GET', '/gists/' + ident, status=404)
    for user in [other, owner]:
        request(user['session'], 'GET', '/-/logout')
        page = request(user['session'], 'GET', '/-/login')
        response = request(user['session'], 'POST', '/-/login', data={
            'username': user['username'], 'password': user['password'], '_csrf': csrf(page.text)},
            allow_redirects=False)
        assert response.status_code == 302
        page = request(user['session'], 'GET', '/-/settings')
        assert page.status_code == 200
        response = request(user['session'], 'DELETE', '/-/settings/account',
            headers={'X-CSRF-Token': csrf(page.text)}, allow_redirects=False)
        assert response.status_code == 302, ('Native account deletion', response.status_code)
        api(user, 'GET', '/gists', status=401)
    report = {'passed': True, 'image': IMAGE,
        'imageId': docker('image', 'inspect', IMAGE, '--format', '{{.Id}}'),
        'blankRamOnlySqlite': True, 'twoNativeAccountsLogin': True,
        'privateAnonymousAndOtherAccountDenied': True, 'createEditCommitsZip': True,
        'privateGitClonePushReopen': True, 'gistsAndAccountsDeletedNatively': True,
        'network': 'internal-only, no production mounts, tokens kept in memory',
        'limitation': 'Isolated native HTTP/API and Git; production OIDC and real browsers not replayed.'}
    OUT.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))
finally:
    if created:
        docker('rm', '-f', NAME)
    if network_created:
        docker('network', 'rm', NETWORK)

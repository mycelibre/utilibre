"""Finite native checks for four unchanged consumers of the libc overlay.

Tor never joins its network. Kittygram uses blank RAM-only data and an isolated
cache; no Instagram requests. Galene/FMD reuse their existing synthetic tests.
"""
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

os.umask(0o077)
HERE = Path(__file__).resolve().parent
ROOT = Path('/var/lib/utilibre-maintenance/security-20261109/musl')
LIMITS = ['--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
          '--memory', '384m', '--memory-swap', '384m', '--cpus', '1',
          '--pids-limit', '96', '--log-driver', 'none']


def run(args, timeout=60, check=True):
    return subprocess.run(args, capture_output=True, timeout=timeout, check=check)


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def kittygram(image):
    name = 'utilibre-kittygram-libc-' + secrets.token_hex(4)
    cache = name + '-cache'
    # This is a tested, retained cache artifact, not a fresh package resolution.
    cache_id = json.loads((ROOT / 'valkey' / 'build.json').read_text())['imageId']
    network = False
    try:
        run(['docker', 'network', 'create', '--internal', name]); network = True
        run(['docker', 'run', '-d', '--name', cache, '--network', name,
             '--network-alias', 'fixture-cache', *LIMITS, '--user', '999:999',
             '--tmpfs', '/data:rw,size=16m,uid=999,gid=999', cache_id,
             'valkey-server', '--save', '', '--appendonly', 'no', '--maxmemory',
             '16mb', '--maxmemory-policy', 'noeviction'])
        env = {'PORT': '8080', 'NUM_WORKERS': '1', 'CODE_CACHE': 'on',
               'SECRET': secrets.token_hex(32), 'REDIS_HOST': 'fixture-cache',
               'REDIS_PORT': '6379', 'RESOLVER': '127.0.0.11',
               'DISABLE_LOGGING': 'true', 'ALLOW_JSON': 'false',
               'REQUIRE_API_TOKEN': 'true', 'ABOUT_MESSAGE': 'Fictional local test'}
        run(['docker', 'run', '-d', '--name', name, '--network', name, *LIMITS,
             '--user', '65534:65534', '--tmpfs', '/tmp:rw,size=16m,mode=1777',
             '--tmpfs', '/app/logs:rw,size=4m,uid=65534,gid=65534',
             '--tmpfs', '/data:rw,size=16m,uid=65534,gid=65534',
             *[v for k, val in env.items() for v in ['-e', k + '=' + val]], image])
        ip = run(['docker', 'inspect', '--format',
                  '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}', name]).stdout.decode().strip()
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())

        def request(path, body=None, cookie=None):
            req = urllib.request.Request('http://' + ip + ':8080' + path,
                data=urllib.parse.urlencode(body).encode() if body is not None else None,
                headers={'Cookie': cookie} if cookie else {})
            try:
                r = opener.open(req, timeout=5)
            except urllib.error.HTTPError as error:
                r = error
            with r:
                return r.status, r.read(1024 * 1024), r.headers

        for _ in range(40):
            try:
                if request('/')[0] == 200:
                    break
            except (OSError, urllib.error.URLError):
                pass
            time.sleep(.25)
        else:
            raise AssertionError('Isolated Kittygram readiness failed')
        assert b'Fictional local test' in request('/')[1]
        assert request('/settings')[0] == 200
        status, body, headers = request('/settings/save', {'language': 'es', 'theme': 'auto'})
        assert status == 302 and urllib.parse.urlparse(headers['Location']).path == '/', (status, body[:300], headers.get('Location'))
        cookie = headers['Set-Cookie'].split(';', 1)[0]
        assert 'Secure' in headers['Set-Cookie'] and 'HttpOnly' in headers['Set-Cookie']
        assert request('/settings', cookie=cookie)[0] == 200
        status, body, headers = request('/search?q=fictional_name')
        assert status == 200 and b'fictional_name' in body
        assert request('/api/user/fictional_name')[0] == 401
        assert request('/api/register_token', {'code': 'fictional-invalid'})[0] == 400
        status, body, _ = request('/api/status')
        assert status == 200 and json.loads(body)['redis']
        assert request('/fictional_name/not-a-route')[0] == 404
        return {'passed': True, 'checks': 9, 'runtime': 'unchanged-kittygram',
                'nativeBlankDatabase': True, 'preferencesRoundtrip': True,
                'localSearch': True, 'protectedApiDenied': True, 'redisConnected': True}
    finally:
        for container in [name, cache]:
            run(['docker', 'rm', '-f', '-v', container], check=False)
        if network:
            run(['docker', 'network', 'rm', name], check=False)


def tor(image):
    name = 'utilibre-tor-libc-' + secrets.token_hex(4)
    config = HERE.parent.parent / 'community/binternet-torrc'
    args = ['docker', 'run', '--rm', '--network', 'none', *LIMITS, '--user', '101:101',
            '--tmpfs', '/var/lib/tor:rw,size=16m,uid=101,gid=101,mode=700',
            '-v', str(config) + ':/etc/tor/torrc:ro', '--entrypoint', 'tor', image]
    version = run(args + ['--version']).stdout.decode().strip()
    result = run(args + ['-f', '/etc/tor/torrc', '--DisableNetwork', '1', '--verify-config'])
    assert b'Configuration was valid' in result.stdout
    assert run(args + ['-f', '/etc/tor/torrc', '--DisableNetwork', '1',
                       '--HiddenServiceVersion', '99', '--verify-config'], check=False).returncode != 0
    effective = run(args + ['-f', '/etc/tor/torrc', '--DisableNetwork', '1', '--dump-config', 'short']).stdout
    assert b'DisableNetwork 1' in effective and b'SocksPort 0' in effective and b'ORPort 0' in effective
    try:
        run(['docker', 'run', '-d', '--name', name, '--network', 'none', *LIMITS,
             '--user', '101:101', '--tmpfs', '/var/lib/tor:rw,size=16m,uid=101,gid=101,mode=700',
             '-v', str(config) + ':/etc/tor/torrc:ro', image, '--DisableNetwork', '1'])
        time.sleep(2)
        assert run(['docker', 'inspect', '--format', '{{.State.Running}}', name]).stdout.strip() == b'true'
        run(['docker', 'exec', name, 'sh', '-ec',
             'test -s /var/lib/tor/binternet/hs_ed25519_secret_key; '
             'test -s /var/lib/tor/binternet/hostname; '
             'test "$(stat -c %a /var/lib/tor/binternet)" = 700'])
        return {'passed': True, 'checks': 5, 'runtime': version,
                'nativeConfigAccepted': True, 'invalidConfigRejected': True,
                'networkDisabled': True, 'ephemeralOnionKeysCreated': True}
    finally:
        run(['docker', 'rm', '-f', '-v', name], check=False)


FIXTURES = {
    'pack-galene-galene': ['../go-final/check-galene.mjs', '../../pack/check-galene-lifecycle.mjs'],
    'additions-fmd': ['../go-runtime-20261011/check-fmd.mjs'],
    'kittygram-kittygram': [],
    'binternet-onion-tor': ['../../community/binternet-torrc'],
}
assert sys.argv[1:] and len(set(sys.argv[1:])) == len(sys.argv[1:])
for key in sys.argv[1:]:
    assert key in FIXTURES
    d = ROOT / key
    b = json.loads((d / 'build.json').read_text())
    assert b['passed'] and b['configurationUnchanged'] and b['unrelatedPackagesUnchanged']
    assert not (d / 'consumer.json').exists(), 'Preserve completed evidence'
    rows = []
    for label, image in [('before', b['base']), ('after', b['imageId'])]:
        if key == 'pack-galene-galene':
            a = json.loads((d / label / 'galene-native.json').read_text())
            fields = ['isolatedTwoClientMedia', 'nativeScreenShareAndStop', 'guestRejoin']
            assert a['status'] == 'passed' and a['imageId'] == image and a['soakSeconds'] == 30
            assert all(a[f] for f in fields)
            row = {'passed': True, 'checks': 3, 'runtime': 'unchanged-galene', **{f: a[f] for f in fields}}
        elif key == 'additions-fmd':
            a = json.loads((d / label / 'fmd-native.json').read_text())
            fields = ['nativeConfigUnchanged', 'registrationProtected', 'twoSyntheticAccounts',
                      'opaqueRecordRoundtrip', 'crossAccountAndAnonymousDenial',
                      'controlBinaryVersionAndList', 'accountDeletion']
            assert a['status'] == 'passed' and a['imageId'] == image and all(a[f] for f in fields)
            row = {'passed': True, 'checks': 7, 'runtime': 'unchanged-fmd', **{f: a[f] for f in fields}}
        else:
            row = kittygram(image) if key == 'kittygram-kittygram' else tor(image)
        rows.append({'imageId': image, **row})
    assert {k: v for k, v in rows[0].items() if k != 'imageId'} == {k: v for k, v in rows[1].items() if k != 'imageId'}
    abi = []
    with tempfile.TemporaryDirectory(dir=d) as tmp:
        for n, image in enumerate([b['base'], b['imageId']]):
            data = run(['docker', 'run', '--rm', '--network', 'none', *LIMITS,
                        '--entrypoint', 'cat', image, '/lib/ld-musl-x86_64.so.1']).stdout
            path = Path(tmp) / str(n); path.write_bytes(data)
            symbols = run(['readelf', '--dyn-syms', '--wide', str(path)]).stdout.decode()
            abi.append({p[7] for line in symbols.splitlines() if len(p := line.split()) >= 8
                        and p[4] in ('GLOBAL', 'WEAK') and p[6] != 'UND'})
    assert len(abi[0]) > 1000 and abi[0] <= abi[1]
    result = {'passed': True, 'profile': 'special-native', 'base': b['base'], 'imageId': b['imageId'],
              'abiPreserved': True, 'baselineExportedSymbols': len(abi[0]),
              'nativeRows': b['nativeRows'], 'rows': rows,
              'fixtureSha256': sha(__file__),
              'supportingFixtureHashes': {p: sha(HERE / p) for p in FIXTURES[key]},
              'network': 'none or internal; synthetic data only',
              'limitation': 'No real phone, remote meeting network, Instagram content or Tor circuit tested.'}
    (d / 'consumer.json').write_text(json.dumps(result, indent=2) + '\n')
    print(key + ': native consumer parity and ABI passed', flush=True)

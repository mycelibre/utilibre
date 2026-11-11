#!/usr/bin/env python3
"""Native shortener/migration/restore checks using fictional data only.

No production mounts, credentials, destination fetches or public route writes.
The temporary internal network has no published ports or external egress.
"""
import hashlib, http.client, json, os, re, secrets, shutil, sqlite3
import subprocess, sys, time
from pathlib import Path

os.umask(0o077)
old, new, directory = sys.argv[1:]
assert all(re.fullmatch(r'sha256:[a-f0-9]{64}', x) for x in (old, new))
root = Path(directory).resolve()
assert str(root).startswith('/var/lib/utilibre-maintenance/') and not root.exists()
root.mkdir(mode=0o700)
net = 'utilibre-chhoto-check-' + secrets.token_hex(4)
# Public, fictional fixture credential; never used on a running public service.
password = 'fictional-shortener-test-only'
password_hash = '$argon2id$v=19$m=65536,t=3,p=1$MG9OeEFtcldlOS5lVFJGQg$cQh/nY9+T9bJfjpCfPyExtsO+25dMYHnEwAtExaZ5m0'
env = root / 'fixture.env'
env.write_text('CHHOTO_PASSWORD=' + password_hash + '\nCHHOTO_HASH_ALGORITHM=Argon2\n')
containers = set()
checks = []
dest = 'https://example.invalid/fictional-workshop?example=1#programme'

def run(args, timeout=60):
    try:
        return subprocess.check_output(args, stderr=subprocess.PIPE, timeout=timeout, text=True).strip()
    except subprocess.CalledProcessError as error:
        (root/'command-error.log').write_text(error.stderr or str(error))
        raise

def docker(*args):
    return run(['docker', *args])

def stop(cid):
    docker('rm', '-f', cid)
    containers.remove(cid)

def start(image, data, auth=True):
    data.mkdir(exist_ok=True, mode=0o700)
    os.chown(data, 65534, 65534)
    for p in data.iterdir(): os.chown(p, 65534, 65534)
    args = ['run', '-d', '--network', net, '--read-only', '--cap-drop', 'ALL',
            '--security-opt', 'no-new-privileges', '--memory', '256m',
            '--memory-swap', '256m', '--cpus', '1', '--pids-limit', '96',
            '--log-driver', 'none', '-v', str(data)+':/data']
    if auth: args += ['--env-file', str(env)]
    for key, value in {
        'CHHOTO_DB_URL': '/data/urls.sqlite', 'CHHOTO_PUBLIC_MODE': 'Enable',
        'CHHOTO_PUBLIC_MODE_EXPIRY_DELAY': '2592000', 'CHHOTO_DISABLE_BACKUPS': 'True',
        'CHHOTO_REDIRECT_METHOD': 'TEMPORARY', 'CHHOTO_EXIT_ON_NO_AUTH': 'True',
        'CHHOTO_SLUG_STYLE': 'UID', 'CHHOTO_SLUG_LENGTH': '8',
        'CHHOTO_TRY_LONGER_SLUG': 'True', 'RUST_LOG': 'off',
    }.items(): args += ['-e', key+'='+value]
    cid = docker(*args, image); containers.add(cid)
    if not auth: return cid, None
    address = json.loads(docker('inspect','--format','{{json .NetworkSettings.Networks}}',cid))[net]['IPAddress']
    port = (address, 4567)
    for _ in range(40):
        try:
            if request(port, '/api/version')[0] == 200: return cid, port
        except (OSError, http.client.HTTPException): pass
        time.sleep(.25)
    raise AssertionError('Isolated application did not become ready')

def request(port, path, data=None, method=None, cookie=None):
    conn = http.client.HTTPConnection(*port, timeout=5)
    headers = {'Content-Type': 'application/json'}
    if cookie: headers['Cookie'] = cookie
    conn.request(method or ('POST' if data is not None else 'GET'), path,
                 json.dumps(data) if data is not None else None, headers)
    response = conn.getresponse()
    result = response.status, {k.lower(): v for k,v in response.getheaders()}, response.read().decode()
    conn.close()
    return result

def create(port, slug='', url=dest, expiry=2592001):
    return request(port, '/api/new', {'shortlink': slug, 'longlink': url, 'expiry_delay': expiry})

def redirect(port, slug):
    status, headers, _ = request(port, '/'+slug)
    assert status == 307 and headers['location'] == dest

def browser_check(port):
    tls = root/'tls'; tls.mkdir()
    run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-days','1',
         '-subj','/CN=isolated-shortener.invalid','-keyout',str(tls/'key.pem'),
         '-out',str(tls/'cert.pem')])
    config = Path('/home/ubuntu/freetools/deployment/chhoto/nginx.conf').read_text()
    assert config.count('listen 8080;') == 1
    config = config.replace('listen 8080;', 'listen 8443 ssl; ssl_certificate /fixtures/cert.pem; ssl_certificate_key /fixtures/key.pem;')
    config = config.replace('http://app:4567', 'http://'+port[0]+':4567')
    (tls/'nginx.conf').write_text(config)
    os.chown(tls,101,101)
    for path in tls.iterdir(): os.chown(path,101,101); path.chmod(0o600)
    gateway = json.loads((Path('/var/lib/utilibre-maintenance/security-20261109/musl/calendar-calino/build.json')).read_text())['imageId']
    cid = docker('run','-d','--network',net,'--user','101:101','--read-only','--cap-drop','ALL',
                 '--security-opt','no-new-privileges','--memory','64m','--cpus','.25','--pids-limit','64',
                 '--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777',
                 '-v',str(tls)+':/fixtures:ro','-v',str(tls/'nginx.conf')+':/etc/nginx/nginx.conf:ro',
                 '--entrypoint','nginx',gateway,'-g','daemon off;')
    containers.add(cid)
    address = json.loads(docker('inspect','--format','{{json .NetworkSettings.Networks}}',cid))[net]['IPAddress']
    try:
        run(['node',str(Path('/home/ubuntu/freetools/deployment/chhoto/check-browser.mjs')),
             'https://'+address+':8443',str(root/'browser'),cid],timeout=180)
    finally: stop(cid)

def snapshot(source, target):
    with sqlite3.connect('file:'+str(source)+'?mode=ro', uri=True) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
        assert dst.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'

try:
    docker('network', 'create', '--internal', '--subnet', '10.253.127.0/28', net)
    data = root / 'data'
    cid, port = start(old, data)
    assert create(port, 'existing-16charsx')[0] == 201
    redirect(port, 'existing-16charsx')
    snapshot(data/'urls.sqlite', root/'baseline.sqlite')
    with sqlite3.connect(root/'baseline.sqlite') as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 5
    checks.append('Old 7.10.8 native create and online synthetic SQLite backup')
    stop(cid)
    cid, port = start(new, data)
    redirect(port, 'existing-16charsx')
    with sqlite3.connect(data/'urls.sqlite') as db:
        assert db.execute('PRAGMA user_version').fetchone()[0] == 5
    checks.append('Native schema 5 reopen preserves an existing link')
    status, _, slug = create(port)
    assert status == 201 and re.fullmatch('[a-z0-9]{8}', slug), (status, slug)
    redirect(port, slug)
    assert create(port, 'taller-jueves')[0] == 201
    redirect(port, 'taller-jueves')
    assert create(port, 'taller-jueves', 'https://example.invalid/other')[0] == 409
    redirect(port, 'taller-jueves')
    checks += ['Anonymous eight-character generation', 'Custom phrase and duplicate rejection without overwrite']
    assert request(port, '/api/all')[0] in (401, 403)
    assert request(port, '/api/del/'+slug, method='DELETE')[0] in (401, 403)
    assert request(port, '/api/login', {'password': 'wrong-fictional-password', 'remember': False})[0] in (401, 403)
    status, headers, _ = request(port, '/api/login', {'password': password, 'remember': False})
    assert status == 200
    cookie = headers['set-cookie'].split(';', 1)[0]
    status, _, body = request(port, '/api/all', cookie=cookie)
    assert status == 200
    row = next(x for x in json.loads(body) if x['shortlink'] == slug)
    assert row['longlink'] == dest and row['hits'] == 0
    assert int(time.time())+2591900 <= row['expiry_time'] <= int(time.time())+2592000
    checks += ['Anonymous management denied; valid native operator login', '30-day expiry cap and no click counts']
    assert create(port, 'expires-soon', expiry=1)[0] == 201
    time.sleep(1.3)
    assert request(port, '/expires-soon')[0] == 404
    assert request(port, '/api/del/'+slug, method='DELETE', cookie=cookie)[0] == 200
    assert request(port, '/'+slug)[0] == 404
    checks.append('Native expiry and authenticated deletion')
    browser_check(port)
    checks.append('Native Chromium desktop/narrow UI, automatic/custom clipboard and local assets')
    snapshot(data/'urls.sqlite', root/'upgraded.sqlite')
    stop(cid)
    restore = root/'restore'; restore.mkdir()
    shutil.copyfile(root/'upgraded.sqlite', restore/'urls.sqlite')
    cid, port = start(new, restore); redirect(port, 'taller-jueves'); stop(cid)
    checks.append('New-version synthetic backup restored with exact new artifact')
    rollback = root/'rollback'; rollback.mkdir()
    shutil.copyfile(root/'baseline.sqlite', rollback/'urls.sqlite')
    cid, port = start(old, rollback); redirect(port, 'existing-16charsx'); stop(cid)
    checks.append('Old image rollback using pre-migration snapshot, not migrated database')
    cid, _ = start(new, root/'no-auth', auth=False)
    for _ in range(30):
        state = json.loads(docker('inspect', '--format', '{{json .State}}', cid))
        if not state['Running']: break
        time.sleep(.2)
    assert not state['Running'] and state['ExitCode'] != 0
    stop(cid); checks.append('Missing administrator authentication fails closed')
    result = {'passed': True, 'oldImage': old, 'newImage': new, 'checks': checks,
              'network': 'Dedicated internal container network, no published ports; redirects not followed',
              'data': 'Fictional destinations and synthetic credentials only',
              'fixtureSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'rollback': 'Pre-upgrade snapshot reopened by 7.10.8; no production rollback performed.'}
    (root/'result.json').write_text(json.dumps(result, indent=2)+'\n')
    print(json.dumps({'passed': True, 'checks': len(checks), 'evidence': str(root/'result.json')}))
finally:
    for cid in list(containers):
        subprocess.run(['docker','rm','-f',cid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    subprocess.run(['docker','network','rm',net], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    env.unlink(missing_ok=True)

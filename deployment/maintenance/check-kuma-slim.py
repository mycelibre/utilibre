"""Restore Kuma's native SQLite into isolated same-version slim candidate.

Only operator monitoring state; print counts, never credentials or URLs.
All monitor polling in the disposable copy is disabled and network is none.
"""
import json, os, pathlib, sqlite3, subprocess, time

root = pathlib.Path('/var/lib/utilibre-maintenance/kuma-slim-20261011')
root.mkdir(mode=0o700, exist_ok=True)
candidate = 'louislam/uptime-kuma:2.5.5-slim@sha256:9c56a772a7df53f444a404c579e87a27bd0c201375d00d6745a75bf8138f4342'
name = 'utilibre-maintenance-kuma-slim-stage'
source = sqlite3.connect('file:/opt/utilibre/community-data/kuma/kuma.db?mode=ro', uri=True)
types = dict(source.execute('select type, count(*) from monitor group by type').fetchall())
assert all(t in ('http', 'port') for t in types), 'Review monitor types before removing bundled Chromium/MariaDB'
backup = root / ('before-' + str(int(time.time())) + '.db')
with sqlite3.connect(backup) as target:
    source.backup(target)
target.close()
source.close()
os.chmod(backup, 0o600)
stage = root / ('stage-' + str(int(time.time())))
stage.mkdir(mode=0o700)
with sqlite3.connect(backup) as src, sqlite3.connect(stage / 'kuma.db') as dst:
    src.backup(dst)
    dst.execute('update monitor set active = 0')
    dst.commit()
src.close()
dst.close()
os.chown(stage, 1000, 1000)
os.chown(stage / 'kuma.db', 1000, 1000)
started = False
try:
    subprocess.run(['docker', 'run', '-d', '--name', name, '--network', 'none', '--user', '1000:1000', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--memory', '512m', '--cpus', '1', '--log-driver', 'local', '--log-opt', 'max-size=1m', '--log-opt', 'max-file=2', '-e', 'UPTIME_KUMA_DB_TYPE=sqlite', '-v', str(stage) + ':/app/data', candidate], check=True, stdout=subprocess.DEVNULL)
    started = True
    script = "fetch('http://127.0.0.1:3001/api/status-page/utilibre').then(async r=>{if(!r.ok)throw Error('HTTP');let p=await r.json();if(!Array.isArray(p.publicGroupList)||p.config?.slug!=='utilibre')throw Error('Missing restored page');console.log(JSON.stringify({status:'passed',slug:p.config.slug}));}).catch(()=>process.exit(1))"
    for attempt in range(30):
        result = subprocess.run(['docker', 'exec', name, 'node', '-e', script], capture_output=True, text=True)
        if result.returncode == 0:
            break
        time.sleep(1)
    if result.returncode != 0:
        log = subprocess.run(['docker', 'logs', name], capture_output=True, text=True)
        (root / 'stage-error.log').write_text(log.stdout + log.stderr + result.stderr)
        raise AssertionError('Candidate did not restore the native status page; inspect private stage-error.log')
    credentials = pathlib.Path('/home/ubuntu/freetools/secrets/uptime-kuma-admin.json').read_text()
    # Upstream awaits sendInfo before installing its login listener. Wait for
    # that native readiness event rather than racing the transport handshake.
    login = "const {io}=require('socket.io-client');const socket=io('http://127.0.0.1:3001',{transports:['websocket']});const deadline=setTimeout(()=>{console.error('socket-timeout');process.exit(1)},15000);socket.on('connect_error',()=>{console.error('socket-connect-error');process.exit(1)});socket.once('info',()=>setTimeout(()=>socket.emit('login'," + credentials + ",r=>{socket.disconnect();clearTimeout(deadline);if(!r?.ok){console.error('native-login-refused');process.exit(1)}console.log('Native restored login passed');process.exit(0);}),100));"
    authenticated = subprocess.run(['docker', 'exec', '-i', name, 'node', '-'], input=login, capture_output=True, text=True)
    if authenticated.returncode != 0:
        (root / 'login-error.log').write_text(authenticated.stderr)
        raise AssertionError('Restored operator login failed; private login-error.log')
    record = {'date': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'status': 'passed', 'monitorTypes': types, 'candidate': candidate, 'backup': str(backup), 'nativeStatusPage': json.loads(result.stdout), 'nativeLogin': 'passed', 'network': 'none', 'scope': 'Same-version native database restore; no production monitors changed'}
    (root / 'result.json').write_text(json.dumps(record, indent=2) + '\n')
    print(json.dumps({k: v for k, v in record.items() if k != 'backup'}))
finally:
    if started:
        subprocess.run(['docker', 'rm', '-f', name], check=True, stdout=subprocess.DEVNULL)

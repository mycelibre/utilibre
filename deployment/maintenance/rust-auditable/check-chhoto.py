#!/usr/bin/env python3
"""Native API/SQLite backup restore on fictional data in network-none candidates."""
import argparse
from pathlib import Path
import hashlib
import json
import os
import secrets
import shutil
import sqlite3
import subprocess
import tempfile
import time

parser = argparse.ArgumentParser()
parser.add_argument('--image', default='utilibre-chhoto:7.8.3-auditable-20261011')
args = parser.parse_args()
assert args.image.startswith('utilibre-chhoto:7.8.3-') or args.image.startswith('sha256:')
os.umask(0o077)
report = Path(tempfile.mkdtemp(prefix='chhoto-auditable-native-', dir='/opt/utilibre/reports'))
original, restored = report/'original', report/'restored'
for directory in [original, restored]:
    directory.mkdir(); os.chown(directory, 65534, 65534)
slug = 'utilibre-qa-' + secrets.token_hex(6)
destination = 'https://example.invalid/fictional-auditable-check'
password = secrets.token_urlsafe(32)
started = []

def launch(directory):
    # Test-only password; production credentials, configuration and data never read.
    command = ['docker','run','-d','--rm','--network','none','--read-only',
        '--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m',
        '--memory-swap','256m','--cpus','1','--pids-limit','64','--log-driver','none',
        '-v',str(directory)+':/data','-e','CHHOTO_PASSWORD='+password,
        '-e','CHHOTO_PUBLIC_MODE=Enable','-e','CHHOTO_PUBLIC_MODE_EXPIRY_DELAY=2592000',
        '-e','CHHOTO_DB_URL=/data/urls.sqlite','-e','CHHOTO_REDIRECT_METHOD=TEMPORARY',
        '-e','CHHOTO_DISABLE_BACKUPS=True','-e','CHHOTO_SITE_URL=https://example.invalid',
        '-e','RUST_LOG=off',args.image]
    cid = subprocess.check_output(command,text=True).strip(); started.append(cid)
    pid = json.loads(subprocess.check_output(['docker','inspect',cid],text=True))[0]['State']['Pid']
    for _ in range(30):
        try:
            if request(pid, '/')[0] == 200: return cid, pid
        except subprocess.CalledProcessError: pass
        time.sleep(.3)
    raise RuntimeError('Isolated candidate not ready')

def request(pid, path, data=None, method=None, cookie=None):
    command = ['nsenter','-t',str(pid),'-n','curl','-sS','--max-time','5','-D','-',
        '-X',method or ('POST' if data is not None else 'GET')]
    if data is not None: command += ['-H','Content-Type: application/json','--data-binary','@-']
    if cookie: command += ['-H','Cookie: '+cookie]
    command += ['http://127.0.0.1:4567'+path]
    result = subprocess.run(command, input=json.dumps(data) if data is not None else None,
        check=True,text=True,capture_output=True).stdout
    head, body = result.split('\n\n',1)
    headers = {}
    for line in head.splitlines()[1:]:
        if ':' in line:
            key,value = line.split(':',1); headers[key.lower()] = value.strip()
    return int(head.split()[1]), headers, body

try:
    cid,pid = launch(original)
    assert request(pid,'/api/new',{'shortlink':slug,'longlink':destination,'expiry_delay':2592001})[0] == 201
    assert request(pid,'/api/all')[0] in [401,403]
    assert request(pid,'/api/del/'+slug,method='DELETE')[0] in [401,403]
    code,headers,_ = request(pid,'/'+slug)
    assert code == 307 and headers['location'] == destination
    code,headers,_ = request(pid,'/api/login',{'password':password,'remember':False})
    assert code == 200
    cookie = headers['set-cookie'].split(';',1)[0]
    assert 'httponly' in headers['set-cookie'].lower() and 'samesite=strict' in headers['set-cookie'].lower()
    code,_,body = request(pid,'/api/all?filter='+slug,cookie=cookie)
    assert code == 200
    row = next(row for row in json.loads(body) if row['shortlink'] == slug)
    assert row['hits'] == 0 and row['longlink'] == destination
    assert 2505600 < row['expiry_time'] - time.time() <= 2592000
    with sqlite3.connect(original/'urls.sqlite') as src, sqlite3.connect(report/'snapshot.sqlite') as dst:
        src.backup(dst)
        assert dst.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    snapshot_hash = hashlib.sha256((report/'snapshot.sqlite').read_bytes()).hexdigest()
    shutil.copy2(report/'snapshot.sqlite', restored/'urls.sqlite')
    os.chown(restored/'urls.sqlite',65534,65534)
    assert hashlib.sha256((restored/'urls.sqlite').read_bytes()).hexdigest() == snapshot_hash
    _,restore_pid = launch(restored)
    code,headers,_ = request(restore_pid,'/'+slug)
    assert code == 307 and headers['location'] == destination
    with sqlite3.connect(restored/'urls.sqlite') as db:
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('SELECT long_url,hits FROM urls WHERE short_url=?',(slug,)).fetchone() == (destination,0)
    assert request(pid,'/api/del/'+slug,method='DELETE',cookie=cookie)[0] == 200
    assert request(pid,'/'+slug)[0] == 404
    result = {'passed':True,'image':args.image,'testedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'nativeCreateRedirectDelete':True,'anonymousListingDeletionDenied':True,
        'nativeHttpOnlySameSiteStrictLogin':True,'zeroClickCount':True,'expiryCapDays':30,
        'sqliteOnlineBackup':True,'isolatedNativeRestore':True,'network':'none',
        'syntheticOnly':True,'testPasswordMode':'native plaintext (isolated fixture only)',
        'productionArgon2Configuration':'unchanged, not read or re-tested by this fixture',
        'secureCookieFlag':'added by existing production nginx gateway; direct network-none native API does not add it'}
    (report/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'report':str(report),**result}))
finally:
    for cid in started:
        subprocess.run(['docker','stop',cid],check=False,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

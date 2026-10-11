#!/usr/bin/env python3
"""Two browser clients through the existing gateway rules; isolated memory only."""
import argparse
from pathlib import Path
import json
import os
import socket
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser()
parser.add_argument('--image', default='utilibre-rustpad:54e4a93-auditable-20261011')
args = parser.parse_args()
assert args.image.startswith('utilibre-rustpad:54e4a93-') or args.image.startswith('sha256:')
os.umask(0o077)
report = Path(tempfile.mkdtemp(prefix='rustpad-auditable-native-',dir='/opt/utilibre/reports'))
report.chmod(0o755)
gateway = '''worker_processes 1;
pid /tmp/nginx.pid;
error_log /dev/stderr crit;
events { worker_connections 256; }
http {
 include /etc/nginx/mime.types;
 access_log off;
 client_body_temp_path /tmp/client;
 proxy_temp_path /tmp/proxy;
 fastcgi_temp_path /tmp/fastcgi;
 uwsgi_temp_path /tmp/uwsgi;
 scgi_temp_path /tmp/scgi;
 server { listen 8080; include /etc/nginx/rustpad.conf; }
}
'''
(report/'nginx.conf').write_text(gateway)
location = (ROOT/'deployment/rustpad/omnitools-location.conf').read_text()
assert location.count('172.29.141.10:3030') == 2
(report/'rustpad.conf').write_text(location.replace('172.29.141.10:3030','127.0.0.1:3030'))
for file in [report/'nginx.conf',report/'rustpad.conf']: file.chmod(0o644)
containers = []; forwarder = None

def launch(command):
    cid = subprocess.check_output(command,text=True).strip(); containers.append(cid); return cid

try:
    app = launch(['docker','run','-d','--rm','--network','none','--read-only',
        '--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m',
        '--memory-swap','512m','--cpus','1','--pids-limit','64','--log-driver','none',args.image])
    pid = json.loads(subprocess.check_output(['docker','inspect',app],text=True))[0]['State']['Pid']
    launch(['docker','run','-d','--rm','--network','container:'+app,'--read-only',
        '--user','101:101','--cap-drop','ALL','--security-opt','no-new-privileges',
        '--memory','64m','--cpus','.25','--pids-limit','64','--log-driver','none',
        '--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=16m,mode=1777',
        '-v',str(report/'nginx.conf')+':/etc/nginx/nginx.conf:ro',
        '-v',str(report/'rustpad.conf')+':/etc/nginx/rustpad.conf:ro',
        '--entrypoint','nginx','utilibre-nginx:1.30.5-alpine-tiff-security-20261011','-g','daemon off;'])
    with socket.socket() as listener:
        listener.bind(('127.0.0.1',0)); port = listener.getsockname()[1]
    forwarder = subprocess.Popen(['socat',f'TCP4-LISTEN:{port},bind=127.0.0.1,reuseaddr,fork',
        rf'EXEC:nsenter -t {pid} -n socat STDIO TCP4\:127.0.0.1\:8080'],
        stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    base = f'http://127.0.0.1:{port}/apps/rustpad/'
    for _ in range(30):
        probe=subprocess.run(['curl','-fsS','--max-time','1',base],capture_output=True)
        if probe.returncode==0: break
        time.sleep(.3)
    else: raise RuntimeError('Isolated gateway not ready')
    environment = {**os.environ,'RUSTPAD_TEST_URL':base,'RUSTPAD_TEST_REPORT':str(report/'browser.json')}
    subprocess.run(['node',str(ROOT/'deployment/rustpad/check-browser.mjs')],env=environment,check=True)
    subprocess.run(['node','--input-type=module','-e','''
const url = new URL('api/socket/fictional-frame-limit', process.env.RUSTPAD_TEST_URL);
url.protocol = 'ws:';
await new Promise((resolve, reject) => {
 const ws = new WebSocket(url);
 const timer = setTimeout(() => { ws.close(); reject(Error('Oversized frame not closed')); }, 4000);
 ws.addEventListener('message', () => ws.send(JSON.stringify({ClientInfo:{name:'x'.repeat(1024*1024),hue:0}})), {once:true});
 ws.addEventListener('close', () => { clearTimeout(timer); resolve(); });
 ws.addEventListener('error', () => {});
});
'''],env=environment,check=True)
    result = {'passed':True,'image':args.image,'testedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
        'browser':'headless Chromium, two independent contexts','network':'none + loopback-only test gateway',
        'gatewayRules':'production location config, only fixed upstream replaced with isolated loopback',
        'sameOriginAssets':True,'nativeTwoClientCollaboration':True,'oversizedFrameClosed':True,'productionChanged':False}
    (report/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'report':str(report),**result}))
finally:
    if forwarder:
        forwarder.terminate(); forwarder.wait(timeout=10)
    for cid in reversed(containers):
        subprocess.run(['docker','stop',cid],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

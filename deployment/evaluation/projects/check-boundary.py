#!/usr/bin/env python3
"""Bounded checks against this disposable pilot and already-owned destinations."""
import concurrent.futures
import datetime
import json
import subprocess
import time
from pathlib import Path

import requests

app = 'utilibre-projects-pilot-app-1'
gateway = 'utilibre-projects-pilot-gateway-1'
network = json.loads(subprocess.check_output(
    ['docker', 'network', 'inspect', 'utilibre-projects-pilot_isolated'], text=True,
))[0]
assert network['Internal'], 'Refusing boundary test outside the isolated pilot'
ip = subprocess.check_output(['docker', 'inspect', gateway, '--format',
                              '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'],
                             text=True).strip()
script = """const net=require('net');
const tests=[['database','db',5432,true],['VM','10.10.1.43',22,false],
 ['edge','10.10.1.3',443,false],['owned public edge','49.12.84.228',443,false]];
Promise.all(tests.map(([label,host,port,allow])=>new Promise(resolve=>{
 const socket=net.connect({host,port});
 const done=(connected,result)=>{socket.destroy();resolve({label,connected,result,expected:allow,pass:connected===allow});};
 socket.setTimeout(2000,()=>done(false,'timeout'));
 socket.once('connect',()=>done(true,'connected'));
 socket.once('error',error=>done(false,error.code));
}))).then(results=>{console.log(JSON.stringify(results));process.exit(results.every(t=>t.pass)?0:1);});"""
boundary = json.loads(subprocess.check_output(['docker', 'exec', app, 'node', '-e', script], text=True))
base = 'http://' + ip + ':1337'
oversize = requests.post(base + '/api/access-tokens', data=b'x' * (10 * 1024 * 1024 + 1), timeout=10)
assert oversize.status_code == 413
assert requests.get(base + '/api/projects', timeout=10).status_code == 401
robots = requests.get(base + '/robots.txt', timeout=10)
assert robots.status_code == 200 and 'Allow: /' in robots.text
assert 'noindex' in robots.headers['X-Robots-Tag']

def read_root(_):
    started = time.monotonic()
    response = requests.get(base, timeout=10)
    return {'status': response.status_code, 'seconds': time.monotonic() - started}

started = time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
    reads = list(executor.map(read_root, range(100)))
assert all(result['status'] == 200 for result in reads)
report = {
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'image': subprocess.check_output(['docker', 'inspect', app, '--format', '{{.Image}}'], text=True).strip(),
    'boundary': boundary,
    'gatewayChecks': ['10MiB+1byte request denied413', 'Unauthenticated projects denied401',
                      'Crawlable robots with noindex header'],
    'ownedRootReadCheck': {
        'requests': 100, 'concurrency': 10, 'successful': 100,
        'elapsedSeconds': round(time.monotonic() - started, 3),
        'p95Seconds': round(sorted(result['seconds'] for result in reads)[94], 4),
        'limitation': 'Owned-root availability check; not collaborative workload capacity.',
    },
    'containerStats': subprocess.check_output(['docker', 'stats', '--no-stream', '--format',
       '{{.Name}} {{.MemUsage}} {{.CPUPerc}}', app, gateway, 'utilibre-projects-pilot-db-1'], text=True).splitlines(),
}
Path('/opt/utilibre/reports/planka-fork-20261009/boundary-resource.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

#!/usr/bin/env python3
"""Fictional-only integration checks against the unpublished evaluation network."""
import concurrent.futures
import json
from pathlib import Path
import subprocess
import sys
import time
import requests

report = Path(sys.argv[1]); report.mkdir(mode=0o700, parents=True, exist_ok=True)
origin = 'http://172.29.100.20:8081'
gateway = 'http://172.29.100.30:8080'
app = 'http://172.29.100.10:5000'
checks = []
session = requests.Session(); session.trust_env = False

def post(base, link):
    return session.post(base + '/article', data={'link': link}, timeout=20)

def docker(*args):
    return subprocess.check_output(['docker', *args], text=True)

containers = json.loads(docker('inspect', *['utilibre-13ft-evaluation-' + name + '-1' for name in ['app', 'fixture', 'gateway']]))
for item in containers:
    assert not item['HostConfig']['PortBindings']
    assert list(item['NetworkSettings']['Networks']) == ['utilibre-13ft-evaluation_isolated']
    assert item['HostConfig']['ReadonlyRootfs']
    assert item['HostConfig']['PidsLimit'] == 32
network = json.loads(docker('network', 'inspect', 'utilibre-13ft-evaluation_isolated'))[0]
assert network['Internal'] and not network['EnableIPv6']
routes = docker('exec', 'utilibre-13ft-evaluation-app-1', 'cat', '/proc/net/route')
assert not any(line.split()[1] == '00000000' for line in routes.splitlines()[1:])
checks.append({'check': 'internal network, no public ports/default route, read-only filesystems and limits', 'passed': True})

r = session.get(gateway + '/', timeout=5)
assert r.status_code == 200 and 'fonts.googleapis.com' not in r.text
assert 'action="/article" method="post"' in r.text
assert 'no-store' in r.headers['Cache-Control']
r = post(gateway, origin + '/article')
assert r.status_code == 200 and 'Fictional rivers study' in r.text
assert 'http-equiv="refresh"' not in r.text.lower()
assert r.headers['Content-Security-Policy'].startswith("sandbox; default-src 'none'")
(report / 'pilot-rendered.html').write_text(r.text)
(report / 'pilot-headers.json').write_text(json.dumps(dict(r.headers), indent=2))
checks.append({'check': 'native POST renderer, local fonts, no cache, strict CSP and no meta refresh', 'passed': True})

for link in ['http://127.0.0.1:5000/', 'http://[::1]:5000/', 'http://169.254.169.254/', 'https://example.invalid/', origin + '/article?secret=fictional', origin + '/article#fragment', 'http://user:pass@172.29.100.20:8081/article']:
    r = post(app, link)
    assert r.status_code == 400 and 'Only the owned fictional fixture' in r.text
for path in ['/status?url=' + origin + '/article', '/https://example.invalid/', '/http://172.29.100.20:8081/article']:
    assert session.get(app + path, timeout=5).status_code == 404
checks.append({'check': 'unlisted origins/paths/queries/userinfo and SSE/cache routes rejected', 'passed': True})

for path in ['/redirect', '/challenge']:
    r = post(app, origin + path)
    assert r.status_code == 400 and 'redirects and fallbacks are off' in r.text
for path in ['/large', '/compressed']:
    r = post(app, origin + path)
    assert r.status_code == 400 and '1 MiB decompressed body limit' in r.text
checks.append({'check': 'redirects and fallback triggers rejected; plain and gzip body caps enforced', 'passed': True})

# Let the tiny request bucket recover, then send a deliberately bounded burst.
time.sleep(3)
start = time.monotonic()
def burst(_):
    with requests.Session() as client:
        client.trust_env = False
        return client.post(gateway + '/article', data={'link': origin + '/article'}, timeout=10).status_code
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    codes = list(pool.map(burst, range(80)))
assert 200 in codes and 429 in codes and set(codes) <= {200, 429}
checks.append({'check': '80-request, 8-client bounded burst', 'passed': True, 'elapsedSeconds': round(time.monotonic()-start,3), 'successful': codes.count(200), 'rateLimited': codes.count(429)})
time.sleep(3)
start = time.monotonic()
r = post(gateway, origin + '/drip')
duration = time.monotonic() - start
assert r.status_code in {500, 502} and 10 <= duration < 17
# Sync worker must recover after killing its deliberately nonresponsive fixture fetch.
assert post(gateway, origin + '/article').status_code == 200
checks.append({'check': 'hard worker deadline stops slow trickle, then normal rendering recovers', 'passed': True, 'seconds': round(duration,3), 'status': r.status_code})

resources = {}
for item in containers:
    name = item['Name'].lstrip('/')
    values = docker('exec', name, 'cat', '/sys/fs/cgroup/memory.peak', '/sys/fs/cgroup/memory.max', '/sys/fs/cgroup/cpu.stat')
    lines = values.splitlines()
    resources[name] = {'peakMiB': round(int(lines[0])/1024/1024,2), 'limitMiB': int(lines[1])//1024//1024, 'cpuStat': dict(line.split() for line in lines[2:])}
result = {'date': '2026-10-08', 'checks': checks, 'resources': resources, 'externalContentRequests': 0, 'scope': 'fictional fixtures only; not public capacity or publisher compatibility'}
(report / 'pilot-results.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result))

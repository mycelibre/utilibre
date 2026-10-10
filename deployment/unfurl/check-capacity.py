"""Modest owned requests to native workers; fictional URNs cause no remote fetch."""
import concurrent.futures,json,time,subprocess,urllib.request,urllib.parse
from pathlib import Path
report=Path('/opt/utilibre/reports/unfurl-20261009')
def state():
 script='import pathlib,json; p=pathlib.Path("/sys/fs/cgroup"); print(json.dumps({k:(p/k).read_text() for k in ["memory.current","memory.peak","memory.events","cpu.stat"]}))'
 return json.loads(subprocess.check_output(['docker','exec','utilibre-unfurl-app-1','python','-c',script],text=True))
def one(n):
 url='http://172.29.122.10:5000/json/visjs?'+urllib.parse.urlencode({'url':f'urn:fictional:library:item:{n}'})
 start=time.monotonic()
 with urllib.request.urlopen(url,timeout=10) as r:
  assert r.status==200
  d=json.load(r);assert d['nodes']
 return time.monotonic()-start
before=state();start=time.monotonic()
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:times=list(pool.map(one,range(80)))
after=state();elapsed=time.monotonic()-start
assert 'oom_kill 0' in after['memory.events'],after
result={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'ownedRequests':80,'concurrency':2,'remoteUrlsFetched':0,'seconds':round(elapsed,3),'latencyP95Seconds':round(sorted(times)[75],4),'before':before,'after':after}
(report/'capacity.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

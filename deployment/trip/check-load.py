"""Small owned-HTTP burst; no authentication, maps, uploads or outside requests."""
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from pathlib import Path
import time,urllib.request,urllib.error,json,subprocess

def one(_):
 start=time.monotonic()
 try:code=urllib.request.urlopen('http://127.0.0.1:3224/api/info',timeout=5).status
 except urllib.error.HTTPError as e:code=e.code
 return code,time.monotonic()-start
start=time.monotonic()
with ThreadPoolExecutor(max_workers=8) as pool:r=list(pool.map(one,range(80)))
elapsed=time.monotonic()-start;time.sleep(3)
assert urllib.request.urlopen('http://127.0.0.1:3224/api/info').status==200
stats=subprocess.check_output(['docker','stats','--no-stream','--format','{{.Name}} {{.CPUPerc}} {{.MemUsage}}','utilibre-trip-app-1','utilibre-trip-proxy-1','utilibre-trip-gateway-1'],text=True)
result={'requests':80,'concurrency':8,'elapsedSeconds':round(elapsed,3),'statusCounts':dict(Counter(c for c,t in r)),'latencyP95Ms':round(sorted(t for c,t in r)[75]*1000,2),'postBurstHealth':200,'statsAfter':stats.strip().splitlines(),'scope':'Owned API-info burst and rate-limit recovery only; not concurrent-trip or map-provider capacity'}
assert set(result['statusCounts'])<={200,429};Path('/opt/utilibre/reports/trip-20261009/load.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))

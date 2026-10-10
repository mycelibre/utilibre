"""Bounded private request burst verifies native gateway rate limit and later health."""
import concurrent.futures,json,urllib.request,urllib.error,urllib.parse
from pathlib import Path
url='http://10.10.1.43:3209/json/visjs?'+urllib.parse.urlencode({'url':'urn:fictional:rate-limit:24'})
def request(_):
 try:
  with urllib.request.urlopen(url,timeout=5) as r:return r.status
 except urllib.error.HTTPError as e:return e.code
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as p:statuses=list(p.map(request,range(8)))
assert 429 in statuses,statuses
with urllib.request.urlopen('http://10.10.1.43:3209/health',timeout=5) as r:assert r.status==200
Path('/opt/utilibre/reports/unfurl-20261009/gateway-limit.json').write_text(json.dumps({'statuses':statuses,'healthAfterBurst':200},indent=2)+'\n')
print(statuses,'health200')

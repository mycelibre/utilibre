"""Two bounded functional requests only, containing fictional query/route data."""
from pathlib import Path
import json,time,urllib.request,urllib.error
p=Path('/opt/utilibre/trip/private');token=json.loads((p/'session-0.json').read_text())['token'];results=[]
for path,method,data in [('/api/completions/search?q=Utilibre%20fictional%20lighthouse%20fixture','GET',None),('/api/completions/route','POST',{'coordinates':[{'lat':0,'lng':0},{'lat':0.0001,'lng':0.0001}],'profile':'foot'})]:
 time.sleep(2.1);h={'Authorization':'Bearer '+token};body=None
 if data is not None:body=json.dumps(data).encode();h['Content-Type']='application/json'
 start=time.monotonic()
 try:r=urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:3224'+path,headers=h,data=body,method=method),timeout=15);status=r.status;payload=r.read()
 except urllib.error.HTTPError as e:status=e.code;payload=e.read()
 results.append({'endpoint':path.split('?')[0],'status':status,'durationSeconds':round(time.monotonic()-start,3),'response':json.loads(payload)})
 assert status in (200,400),results[-1]
Path('/opt/utilibre/reports/trip-20261009/providers.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))

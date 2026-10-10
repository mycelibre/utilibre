"""Only owned/invalid/private destinations; never fetch a third party's content."""
import json,subprocess,time,urllib.request,urllib.error
from pathlib import Path
out=Path('/opt/utilibre/reports/trip-20261009');results={}
code='''import json,urllib.request,urllib.error,socket
r={}
for host,port in [('10.10.1.43',22),('172.29.152.30',8080),('172.29.152.20',80),('1.1.1.1',443)]:
 try:s=socket.create_connection((host,port),timeout=1);s.close();r[f'{host}:{port}']='UNEXPECTED connection'
 except OSError:r[f'{host}:{port}']='blocked'
for url in ['http://127.0.0.1/fixture','http://169.254.169.254/fixture','http://10.10.1.43/fixture','https://example.invalid/fixture','http://[::1]/fixture']:
 try:r[url]=urllib.request.urlopen(url,timeout=3).status
 except urllib.error.HTTPError as e:r[url]=e.code
 except Exception as e:r[url]=403 if '403 Forbidden' in str(e) else type(e).__name__
print(json.dumps(r))'''
r=subprocess.run(['docker','exec','-i','utilibre-trip-app-1','python','-c',code],capture_output=True,text=True,check=True);results['application']=json.loads(r.stdout);assert all(x=='blocked' for k,x in results['application'].items() if '://' not in k);assert all(x==403 for k,x in results['application'].items() if '://' in k),results
# Test the host namespace destination boundary independently of Squid's ACL.
pid=subprocess.check_output(['docker','inspect','utilibre-trip-proxy-1','--format','{{.State.Pid}}'],text=True).strip()
probe="import socket; s=socket.socket(); s.settimeout(1); result=s.connect_ex(('172.29.152.10',8000)); print(result); assert result != 0"
r=subprocess.run(['nsenter','-t',pid,'-n','python3','-c',probe],capture_output=True,text=True);assert r.returncode==0,r.stderr;results['proxyDirectAppConnection']='blocked'
# No provider calls: invalid auth is handled in the app, then the gateway rate ceiling.
base='http://127.0.0.1:3224'
for path in ['/api/completions/bulk','/api/completions/google/resolve-shortlink/fixture','/api/settings/checkversion']:
 try:results[path]=urllib.request.urlopen(base+path).status
 except urllib.error.HTTPError as e:results[path]=e.code
 assert results[path]==403
statuses=[]
for x in range(3):
 try:statuses.append(urllib.request.urlopen(base+'/api/completions/search?q=fictional').status)
 except urllib.error.HTTPError as e:statuses.append(e.code)
assert 429 in statuses and 401 in statuses,statuses;results['providerRateWithoutOutboundCall']=statuses
h=urllib.request.urlopen(base+'/api/info').headers
for key in ['Content-Security-Policy','X-Robots-Tag','Referrer-Policy','Cache-Control']:results[key]=h.get(key)
assert results['Referrer-Policy']=='origin' and results['Cache-Control']=='no-store' and results['Content-Security-Policy']
(out/'boundary.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))

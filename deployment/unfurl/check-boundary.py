"""Run with docker compose exec -T app python < check-boundary.py."""
import os,socket,json,time,requests
proxy={'http':os.environ['HTTP_PROXY'],'https':os.environ['HTTPS_PROXY']}
blocked=[
 'http://127.0.0.1/', 'http://127.1/', 'http://2130706433/',
 'http://0.0.0.0/', 'http://10.10.1.43/', 'http://169.254.169.254/',
 'http://172.29.122.10/', 'http://172.29.123.1/',
 'http://192.168.0.1/', 'http://100.64.0.1/', 'http://198.18.0.1/',
 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://[fd00::1]/',
 'http://example.org:8080/', 'https://127.0.0.1/',
]
results=[]
for url in blocked:
 try:
  r=requests.get(url,proxies=proxy,timeout=5,allow_redirects=False,stream=True)
  assert r.status_code in ((400,403,503) if "[" in url else (400,403)), (url,r.status_code)
  results.append({'url':url,'status':r.status_code});r.close()
 except requests.exceptions.ProxyError:
  assert url.startswith('https:');results.append({'url':url,'connectDenied':True})
for address in [('1.1.1.1',80),('10.10.1.43',80),('172.29.122.30',8080)]:
 try:
  s=socket.create_connection(address,timeout=1);s.close();raise AssertionError(('direct route exists',address))
 except (OSError,TimeoutError):pass
r=requests.get('https://utilibre.org/en/',proxies=proxy,timeout=8,stream=True)
assert r.status_code==200,r.status_code;r.close()
print(json.dumps({'blocked':results,'directBypassBlocked':True,'publicHttpsReachable':True},indent=2))

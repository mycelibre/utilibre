"""Run inside the reader app container; tests only blocked/owned destinations."""
import json,requests,socket
proxy='http://172.29.118.20:3128'
urls=['http://127.0.0.1/','http://127.1/','http://2130706433/','http://0x7f000001/','http://0177.0.0.1/','http://169.254.169.254/','http://10.10.1.43/','http://172.29.118.20/','http://192.168.1.1/','http://100.64.0.1/','http://[::1]/','http://[::ffff:127.0.0.1]/','http://[fd00::1]/','http://192.0.2.1/','http://198.51.100.1/','http://203.0.113.1/','http://224.0.0.1/','http://255.255.255.255/','http://tools.utilibre.org:8080/','https://tools.utilibre.org:444/']
results=[]
for url in urls:
 try:
  with requests.Session() as s:
   s.trust_env=False;s.proxies={'http':proxy,'https':proxy}
   r=s.get(url,timeout=5,allow_redirects=False)
   passed=r.status_code in (400,403) and ('ERR_ACCESS_DENIED' in r.headers.get('X-Squid-Error','') or r.status_code==400)
   results.append({'url':url,'status':r.status_code,'squid_error':r.headers.get('X-Squid-Error'),'pass':passed})
 except requests.exceptions.ProxyError as e:
  results.append({'url':url,'proxy_denied': '403' in str(e),'pass':'403' in str(e)})
for address,port in [('1.1.1.1',443),('10.10.1.43',80),('172.29.118.1',22)]:
 try:
  socket.create_connection((address,port),timeout=1).close();passed=False
 except OSError:passed=True
 results.append({'direct':address,'port':port,'pass':passed})
print(json.dumps(results,indent=2));assert all(x['pass'] for x in results)

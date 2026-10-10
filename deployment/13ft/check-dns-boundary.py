"""Temporary DNS fixture test. Restores reviewed public resolver configuration."""
import json,subprocess,time
from pathlib import Path
report=Path('/opt/utilibre/reports/13ft-public-20261009')
config=Path(__file__).with_name('squid.conf')
get='''import requests,json
s=requests.Session();s.trust_env=False;s.proxies={"http":"http://172.29.118.20:3128"}
r=s.get("http://NAME.reader-fixture.test/fictional",timeout=6,allow_redirects=False)
print(json.dumps({"status":r.status_code,"squid_error":r.headers.get("X-Squid-Error")}))'''
results=[]
try:
 for mode in ['public','private','mixed','private-v6']:
  script='import json;p="/tmp/utilibre-dns-mode";d=json.load(open(p));d["mode"]='+repr(mode)+';open(p,"w").write(json.dumps(d))'
  subprocess.run(['docker','exec','utilibre-13ft-proxy-1','python','-c',script],check=True)
  subprocess.run(['docker','kill','--signal=HUP','utilibre-13ft-proxy-1'],check=True,stdout=subprocess.DEVNULL)
  time.sleep(3)
  name='change' if mode in {'public','private'} else mode
  raw=subprocess.check_output(['docker','exec','utilibre-13ft-app-1','python','-c',get.replace('NAME',name)],text=True)
  result=json.loads(raw);result['mode']=mode
  denied=(result['squid_error'] or '').startswith('ERR_ACCESS_DENIED')
  result['pass']= not denied if mode in {'public','private-v6'} else denied
  if mode=='private-v6':
   disabled=subprocess.check_output(['docker','exec','utilibre-13ft-proxy-1','cat','/proc/sys/net/ipv6/conf/all/disable_ipv6'],text=True).strip()=='1'
   result['pass']=result['pass'] and disabled
   result['scope']='IPv6 disabled; A queried, private AAAA fixture is not requested'
  results.append(result)
finally:
 config.write_text((report/'squid-final.conf').read_text())
 subprocess.run(['docker','kill','--signal=HUP','utilibre-13ft-proxy-1'],stdout=subprocess.DEVNULL,check=True)
 raw=subprocess.run(['docker','exec','utilibre-13ft-proxy-1','cat','/tmp/utilibre-dns-queries.jsonl'],text=True,capture_output=True).stdout
 (report/'dns-queries.jsonl').write_text(raw)
 (report/'dns-boundary.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2));assert all(x['pass'] for x in results)

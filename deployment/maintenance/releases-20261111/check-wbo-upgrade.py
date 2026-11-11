import json,subprocess,secrets,time,os
from pathlib import Path
os.umask(0o077)
r=Path('/var/lib/utilibre-maintenance/held-upgrades-20261111/wbo');out=r/'native';out.mkdir()
repo=Path('/home/ubuntu/freetools');net='maintenance-wbo-'+secrets.token_hex(4);cids=[]
def run(*args):return subprocess.check_output(args,stderr=subprocess.PIPE,text=True,timeout=180).strip()
def docker(*a):return run('docker',*a)
try:
 docker('network','create','--internal',net)
 image=json.loads(docker('image','inspect','utilibre-wbo:2.18.33-candidate'))[0]['Id']
 live=json.loads(docker('inspect','utilibre-collaboration-pilot-wbo-1'))[0]
 env=[v for v in live['Config']['Env'] if v.startswith(('WBO_','OTEL_','LOG_LEVEL='))];args=[]
 for e in env:args+=['-e',e]
 app=docker('run','-d','--network',net,'--network-alias','wbo','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','.5','--pids-limit','64','--log-driver','none','--tmpfs','/opt/app/server-data:rw,size=64m,uid=1000,gid=1000','--tmpfs','/tmp:rw,size=8m,mode=1777',*args,image);cids.append(app)
 for _ in range(40):
  try:
   docker('exec',app,'node','-e',"fetch('http://127.0.0.1:8080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))");break
  except subprocess.CalledProcessError:time.sleep(.5)
 else:raise AssertionError('WBO startup failed')
 ip=json.loads(docker('inspect',app))[0]['NetworkSettings']['Networks'][net]['IPAddress'];origin='http://'+ip+':8080'
 text=(repo/'deployment/community/check-collaboration.mjs').read_text().replace("'../../portal/node_modules/playwright-core/index.mjs'","'/home/ubuntu/freetools/portal/node_modules/playwright-core/index.mjs'")
 start=text.index('const origin =');end=text.index('const browser =',start);text=text[:start]+'const origin = '+json.dumps(origin)+';\n'+text[end:]
 # Dedicated upstream workflow; gateway rejection/source-offer checks are separate.
 start=text.index('  const denied =');end=text.index('  assert.deepEqual([...external]',start);text=text[:start]+text[end:]
 text=text.replace("version:'WBO 2.9.0-p3'","version:'WBO 2.18.33-p1'").replace(",'foreign Origin rejected','source download','oversized body rejected'",'')
 text=text.replace("`/tmp/utilibre-wbo-${i ? 'es-mobile' : 'en-desktop'}.png`",json.dumps(str(out))+"+`/wbo-${i ? 'es-mobile' : 'en-desktop'}.png`")
 (out/'browser.mjs').write_text(text)
 result=run('node',str(out/'browser.mjs'));(out/'browser.json').write_text(result+'\n')
 (out/'result.json').write_text(json.dumps({'passed':True,'imageId':image,'internalNetwork':True,'productionChanged':False,'twoClients':True,'reconnection':True,'nativeSvgExport':True,'mobile':'viewport emulation only','telemetryDisabled':True},indent=2)+'\n');print('WBO native collaboration checks passed')
except subprocess.CalledProcessError as e:
 (out/'command-error.log').write_text(e.stderr or '');raise
finally:
 for cid in cids:subprocess.run(['docker','rm','-f',cid],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 subprocess.run(['docker','network','rm',net],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

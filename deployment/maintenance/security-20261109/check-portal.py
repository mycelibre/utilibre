import subprocess,json,pathlib
r=pathlib.Path('/var/lib/utilibre-maintenance/security-20261109');name='utilibre-chartdb-portal-check'
inputs=json.loads((pathlib.Path(__file__).resolve().parent/'portal-inputs.json').read_text())
c=json.loads(subprocess.check_output(['docker','inspect','public-utility-portal-1']))[0]
env=[e for e in c['Config']['Env'] if e.startswith('PUBLIC_') or e.split('=')[0] in ['ENABLED_SERVICES','LISTED_SERVICES','DEFAULT_LANGUAGE','PROJECT_NAME','PRIVATE_PREVIEW']]
try:
 subprocess.run(['docker','run','-d','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','64','--log-driver','none',*[v for e in env for v in ['-e',e]],inputs['imageId']],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 script="""const assert=require('assert');(async()=>{for(const lang of ['en','es']){let r;for(let i=0;i<10;i++){try{r=await fetch('http://127.0.0.1:8080/'+lang+'/software');break}catch{await new Promise(x=>setTimeout(x,300))}}assert.equal(r.status,200);const h=await r.text();for(const v of ['1.21.0-p1','1.30.4','3.9.0','0.42.0-p1','0.7.101-p1','4.2.0-p1','1.3.2-p1','32.6.10-p1'])assert(h.includes(v),v);console.log(lang+': current version records rendered');}})().catch(e=>{console.error(e);process.exit(1)})"""
 result=subprocess.check_output(['docker','exec',name,'node','-e',script],text=True);(r/'portal-staging.txt').write_text(result);print(result)
 assert subprocess.check_output(['docker','exec',name,'cat','/lib/apk/db/installed'])==subprocess.check_output(['docker','exec','public-utility-portal-1','cat','/lib/apk/db/installed'])
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for kind,ref in [('before',inputs['base']),('after',inputs['imageId'])]:
 args=['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image','--config','/dev/null','--ignorefile','/dev/null','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--skip-db-update','--skip-java-db-update','--skip-check-update','--skip-version-check','--skip-vex-repo-update','--disable-telemetry','--offline-scan','--timeout','3m','--image-src','docker','--format','json','--list-all-pkgs','--output',str(r/f'portal-{kind}-scan.json'),ref]
 with (r/f'portal-{kind}-scan.log').open('w') as log:subprocess.run(args,stdout=log,stderr=log,timeout=200,check=True)
def findings(d):return sorted((v['VulnerabilityID'],v['PkgName'],v['InstalledVersion'],v['Severity']) for x in d.get('Results',[]) for v in x.get('Vulnerabilities',[]))
a=json.loads((r/'portal-before-scan.json').read_text());b=json.loads((r/'portal-after-scan.json').read_text());assert a['Metadata']['ImageID']==inputs['base'] and b['Metadata']['ImageID']==inputs['imageId'];assert findings(a)==findings(b);assert sum(len(x.get('Packages',[])) for x in b.get('Results',[]))>0
print('Portal runtime packages identical; same database findings unchanged:',len(findings(b)))

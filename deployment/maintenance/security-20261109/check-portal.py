import subprocess,json,pathlib,sys
assert sys.argv[1:] in ([],['--shortener'],['--abuse'],['--pack'],['--search'],['--bentopdf'])
bento=sys.argv[1:]==['--bentopdf'];shortener=bool(sys.argv[1:]) and not bento;search=sys.argv[1:]==['--search'];pack=search or sys.argv[1:]==['--pack'];abuse=pack or sys.argv[1:]==['--abuse']
profile='portal-search' if search else 'portal-pack' if pack else 'portal-abuse' if abuse else 'portal-shortener' if shortener else 'portal'
r=pathlib.Path('/var/lib/utilibre-maintenance/releases-20261111') if bento else pathlib.Path('/var/lib/utilibre-maintenance/security-20261109')/(profile if shortener else '.');name='utilibre-'+profile+'-check'
inputs=json.loads((pathlib.Path(__file__).resolve().parent.parent/'releases-20261111/portal-inputs.json' if bento else pathlib.Path(__file__).resolve().parent/(profile+'-inputs.json')).read_text())
c=json.loads(subprocess.check_output(['docker','inspect','public-utility-portal-1']))[0]
env=[e for e in c['Config']['Env'] if e.startswith('PUBLIC_') or e.split('=')[0] in ['ENABLED_SERVICES','LISTED_SERVICES','DEFAULT_LANGUAGE','PROJECT_NAME','PRIVATE_PREVIEW']]
try:
 subprocess.run(['docker','run','-d','--name',name,'--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','64','--log-driver','none',*[v for e in env for v in ['-e',e]],inputs['imageId']],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
 script="""const assert=require('assert');(async()=>{for(const lang of ['en','es']){let r;for(let i=0;i<10;i++){try{r=await fetch('http://127.0.0.1:8080/'+lang+'/software');break}catch{await new Promise(x=>setTimeout(x,300))}}assert.equal(r.status,200);const h=await r.text();for(const v of ['1.21.0-p1','1.30.4','3.9.0','0.42.0-p1','0.7.101-p1','4.2.0-p1','1.3.2-p1','32.6.10-p1'])assert(h.includes(v),v);console.log(lang+': current version records rendered');}})().catch(e=>{console.error(e);process.exit(1)})"""
 if shortener or bento:
  script=script.replace("['1.21.0-p1','1.30.4','3.9.0','0.42.0-p1','0.7.101-p1','4.2.0-p1','1.3.2-p1','32.6.10-p1']",json.dumps(inputs['expectedVersions']))
 result=subprocess.check_output(['docker','exec',name,'node','-e',script],text=True);(r/'portal-staging.txt').write_text(result);print(result)
 if shortener:
  guide="""(async()=>{for(const path of ['/en/guides/shorten-link','/es/guias/acortar-enlace']){const r=await fetch('http://127.0.0.1:8080'+path),h=await r.text();require('assert')(r.status===200&&h.includes('taller-jueves')&&h.includes('https://links.utilibre.org'));console.log(path+': updated guide and existing tool link passed');}})().catch(e=>{console.error(e);process.exit(1)})"""
  result=subprocess.check_output(['docker','exec',name,'node','-e',guide],text=True);(r/'guide-staging.txt').write_text(result);print(result)
 if abuse:
  report="""(async()=>{const assert=require('assert');for(const path of ['/en/abuse','/es/denunciar-abuso']){const r=await fetch('http://127.0.0.1:8080'+path),h=await r.text();assert.equal(r.status,200);assert(h.includes('mailto:admin@utilibre.org?subject=')&&!h.includes('name=\"body\"'));assert(!h.includes('<form'));assert(h.includes('referrerpolicy=\"no-referrer\"')||h.includes('referrerpolicy=\"no-referrer\"'.replaceAll('\\"',"'")));console.log(path+': report page and privacy-safe contact passed');}for(const path of ['/en/privacy','/es/privacidad']){const r=await fetch('http://127.0.0.1:8080'+path),h=await r.text();assert.equal(r.status,200);assert(h.includes('search')&&h.includes('speed'));}})().catch(e=>{console.error(e);process.exit(1)})"""
  result=subprocess.check_output(['docker','exec',name,'node','-e',report],text=True);(r/'abuse-staging.txt').write_text(result);print(result)
 assert subprocess.check_output(['docker','exec',name,'cat','/lib/apk/db/installed'])==subprocess.check_output(['docker','exec','public-utility-portal-1','cat','/lib/apk/db/installed'])
finally:subprocess.run(['docker','rm','-f',name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for kind,ref in [('before',inputs['base']),('after',inputs['imageId'])]:
 args=['unshare','--net','--','/opt/utilibre/maintenance/bin/trivy','image','--config','/dev/null','--ignorefile','/dev/null','--cache-dir',str(r/'scan-cache') if bento else '/var/cache/utilibre-security','--scanners','vuln','--skip-db-update','--skip-java-db-update','--skip-check-update','--skip-version-check','--skip-vex-repo-update','--disable-telemetry','--offline-scan','--timeout','3m','--image-src','docker','--format','json','--list-all-pkgs','--output',str(r/f'portal-{kind}-scan.json'),ref]
 with (r/f'portal-{kind}-scan.log').open('w') as log:subprocess.run(args,stdout=log,stderr=log,timeout=200,check=True)
def findings(d):return sorted((v['VulnerabilityID'],v['PkgName'],v['InstalledVersion'],v['Severity']) for x in d.get('Results',[]) for v in x.get('Vulnerabilities',[]))
a=json.loads((r/'portal-before-scan.json').read_text());b=json.loads((r/'portal-after-scan.json').read_text());assert a['Metadata']['ImageID']==inputs['base'] and b['Metadata']['ImageID']==inputs['imageId'];assert findings(a)==findings(b);assert sum(len(x.get('Packages',[])) for x in b.get('Results',[]))>0
print('Portal runtime packages identical; same database findings unchanged:',len(findings(b)))

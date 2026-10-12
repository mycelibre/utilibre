import json,os,pathlib,subprocess,sys
here=pathlib.Path(__file__).resolve().parent
out=pathlib.Path('/var/lib/utilibre-maintenance/runtime-gnutls-minimization-20261012')
os.umask(0o077)
for spec in json.loads((here/'specs.json').read_text()):
 if sys.argv[1:] and spec['key'] not in sys.argv[1:]: continue
 folder=out/'images'/spec['key'];build=json.loads((folder/'build.json').read_text());assert build['passed']
 image=build['imageId']
 env={**os.environ,'GOMAXPROCS':'1','GOMEMLIMIT':'512MiB','TRIVY_DISABLE_TELEMETRY':'true','TRIVY_SKIP_VERSION_CHECK':'true'}
 with (folder/'scan.log').open('w') as log:
  subprocess.run(['systemd-run','--quiet','--scope','-p','CPUQuota=100%','-p','MemoryMax=2G','/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',str(folder/'trivy.json'),image],env=env,check=True,stdout=log,stderr=log)
 scan=json.loads((folder/'trivy.json').read_text());packages=[p for r in scan.get('Results',[]) for p in r.get('Packages',[])];assert len(packages)>100
 assert not any(p['Name'] in ['apt','libgnutls30'] for p in packages)
 findings=[v for r in scan.get('Results',[]) for v in r.get('Vulnerabilities',[])];assert not any(v['VulnerabilityID'] in ['CVE-2026-88647','CVE-2026-88648'] for v in findings)
 code=(here/'linkage.cjs').read_text()
 r=subprocess.run(['docker','run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_READ_SEARCH','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--entrypoint','node',image,'-e',code],capture_output=True,text=True,timeout=300)
 (folder/'linkage.log').write_text(r.stdout+r.stderr);assert r.returncode==0,spec['key']+' linkage check failed'
 linkage=json.loads(r.stdout);assert linkage['passed']
 base_run=subprocess.run(['docker','run','--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_READ_SEARCH','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--entrypoint','node',spec['base'],'-e',code],capture_output=True,text=True,timeout=300)
 (folder/'linkage-base.log').write_text(base_run.stdout+base_run.stderr);assert base_run.returncode==0
 baseline=json.loads(base_run.stdout)
 assert linkage['missingDependencies']==baseline['missingDependencies'], 'New unresolved native dependencies'
 assert linkage['gnutlsDependencies']==[], 'A retained runtime object requires GnuTLS'
 linkage['baselineMissingDependenciesUnchanged']=True
 result={'imageId':image,'passed':True,'packages':len(packages),'gnutlsFindings':0,'linkage':linkage}
 (folder/'scan.json').write_text(json.dumps(result,indent=2)+'\n');print(spec['key']+': package absence and native linkage verified',flush=True)

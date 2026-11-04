// Reconcile canonical inputs with exact graphs already built and tested by the
// existing codec/JOSE recipes. No dependency resolution, service changes or waiver.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const repo='/home/ubuntu/freetools',base=repo+'/deployment/maintenance',here=new URL('.',import.meta.url).pathname;
const root='/var/lib/utilibre-maintenance/security-20261103/go-locks',spec=JSON.parse(fs.readFileSync(here+'go-lock-inputs.json'));
const mode=process.argv[2];assert(['prepare','verify'].includes(mode)&&process.argv.length===3);
const sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
fs.mkdirSync(root,{recursive:true});assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:90000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(root+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Go lock reconciliation failed; private evidence retained');}};
const plan=[];
// Verify every input before touching any canonical file.
for(const s of spec.rows){
 assert(['github.com/klauspost/compress','github.com/go-jose/go-jose/v4'].includes(s.dependency));
 assert.equal(s.deploymentAllowed,false);const d='/var/lib/utilibre-maintenance/security-20261028/'+s.profile+'/'+s.key;
 assert.equal(sha(fs.readFileSync(d+'/build.json')),s.buildReceiptSha256);
 const b=read(d+'/build.json'),v=read(d+'/inventory.json'),g=read(d+'/scan-gate.json');
 assert(b.passed&&b.native.passed&&b.configurationUnchanged&&b.regression.passed);
 assert(v.passed&&g.passed&&g.targetedFindingRemoved&&g.newHighCritical===0);
 for(const p of [b,v,g,b.native])assert.equal(p.imageId,s.imageId);
 assert.deepEqual(b.binaries,s.binaries);
 const pairs={};
 for(const [f,h]of Object.entries(s.files)){
  const old=cp.execFileSync('git',['show',spec.baselineCommit+':deployment/maintenance/'+s.canonical+'/'+f],{cwd:repo}),next=fs.readFileSync(base+'/'+s.approved+'/'+f),now=fs.readFileSync(base+'/'+s.canonical+'/'+f);
  assert.equal(sha(old),h.before);assert.equal(sha(next),h.after);assert([h.before,h.after].includes(sha(now)),'Canonical drift: '+s.key+'/'+f);
  if(mode==='verify')assert.equal(sha(now),h.after);
  pairs[f]={old:old.toString(),next:next.toString()};plan.push({path:base+'/'+s.canonical+'/'+f,next,current:sha(now),hash:h.after});
 }
 const old=pairs['go.mod'].old,needle=s.dependency+' '+s.from;assert.equal(old.split(needle).length,2);assert.equal(old.replace(needle,s.dependency+' '+s.to),pairs['go.mod'].next);
 const unrelated=t=>t.trim().split('\n').filter(x=>!x.startsWith(s.dependency+' ')).sort();assert.deepEqual(unrelated(pairs['go.sum'].old),unrelated(pairs['go.sum'].next));
}
if(mode==='prepare'){
 let changed=0;for(const p of plan)if(p.current!==p.hash){fs.writeFileSync(p.path+'.prepared',p.next);fs.renameSync(p.path+'.prepared',p.path);changed++;}
 fs.writeFileSync(root+'/preparation.json',JSON.stringify({date:new Date().toISOString(),passed:true,files:plan.length,changed,productionChanged:false},null,2)+'\n');console.log('Canonical Go inputs reconciled: '+changed+' files changed; no production change.');
}else{
 const rows=[];
 for(const s of spec.rows){
  const dir=root+'/'+s.key;fs.mkdirSync(dir,{recursive:true});
  const image=run('docker',['image','inspect','--format','{{.Id}}',s.imageId]);assert.equal(image,s.imageId);
  const cid=run('docker',['create','--entrypoint','/bin/true',s.imageId]);
  try{for(const b of s.binaries){const target=dir+'/'+b.path.split('/').at(-1);run('docker',['cp',cid+':'+b.path,target]);assert.equal(sha(fs.readFileSync(target)),b.binarySha256);}}
  finally{run('docker',['rm',cid]);}
  const text=run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=32m','-e','GOTOOLCHAIN=local','-e','GOTELEMETRY=off','-e','GOPROXY=off','-e','GOSUMDB=off','-e','GOMODCACHE=/modules','-e','GOPATH=/tmp/gopath','-v',s.moduleCache+':/modules:ro','-v',base+'/'+s.canonical+':/source:ro','-v',dir+':/artifacts:ro','-w','/source',s.compiler,'sh','-ec','go mod verify; go list -mod=readonly -m '+s.dependency+'; go version -m /artifacts/*']);
  assert(text.includes('all modules verified'));assert(text.includes(s.dependency+' '+s.to));fs.writeFileSync(dir+'/modules.log',text);
  const scans=[];for(const state of ['baseline','candidate']){
   const source=dir+'/'+state;fs.mkdirSync(source,{recursive:true});
   for(const f of ['go.mod','go.sum'])fs.writeFileSync(source+'/'+f,state==='candidate'?fs.readFileSync(base+'/'+s.canonical+'/'+f):cp.execFileSync('git',['show',spec.baselineCommit+':deployment/maintenance/'+s.canonical+'/'+f],{cwd:repo}));
   const file=dir+'/'+state+'-scan.json';run('/opt/utilibre/maintenance/bin/trivy',['fs','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','1m','--no-progress','--format','json','--output',file,source],{env:{PATH:'/usr/bin:/bin',TRIVY_SKIP_VERSION_CHECK:'true'}});
   const r=read(file);assert(r.Results.some(r=>r.Type==='gomod'));const findings=r.Results.flatMap(r=>r.Vulnerabilities||[]);scans.push({state,sha256:sha(fs.readFileSync(file)),findings:findings.map(v=>({id:v.VulnerabilityID,package:v.PkgName,severity:v.Severity}))});
  }
  const selected=r=>r.findings.filter(v=>v.package===s.dependency&&['HIGH','CRITICAL'].includes(v.severity));assert(selected(scans[0]).length>0);assert.equal(selected(scans[1]).length,0);
  rows.push({key:s.key,imageId:s.imageId,passed:true,recordedNativeEvidence:true,freshOfflineModuleVerification:true,newCompilation:false,scans});console.log(s.key+': recorded build/behavior proof, exact binary and fresh offline module check passed');
 }
 fs.writeFileSync(root+'/verification.json',JSON.stringify({date:new Date().toISOString(),passed:true,rows,dbSha256:sha(fs.readFileSync('/var/cache/utilibre-security/db/trivy.db')),network:'none',productionChanged:false,deploymentAllowed:false,limitations:'Reuses exact existing compiled/native evidence. No new compilation or application rollout. v3 JOSE findings remain separate.'},null,2)+'\n');
}

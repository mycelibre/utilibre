// Correct historical rebuild inputs; never activate these intermediate images.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const repo='/home/ubuntu/freetools',root='/var/lib/utilibre-maintenance/security-20261103/npm-locks',here=new URL('.',import.meta.url).pathname;
const spec=JSON.parse(fs.readFileSync(here+'npm-lock-inputs.json'));
const [phase,key]=process.argv.slice(2);assert(['download','prepare','check'].includes(phase)&&process.argv.length===4);
const s=spec.rows.find(r=>r.key===key);assert(s&&s.deploymentAllowed===false);
const dir=root+'/'+key,sha=b=>createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
fs.mkdirSync(dir,{recursive:true});assert(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize>8*1024**3);
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/'+phase+'-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(key+' '+phase+' failed; private evidence retained');}};
for(const [file,hash]of Object.entries(spec.adapters))assert.equal(sha(fs.readFileSync(repo+'/deployment/maintenance/'+file)),hash,'Reviewed adapter drift: '+file);
for(const [f,hash]of Object.entries(s.files)){
 const before=cp.execFileSync('git',['show',spec.baselineCommit+':'+s.directory+'/'+f],{cwd:repo}),after=fs.readFileSync(repo+'/'+s.directory+'/'+f);
 assert.equal(sha(before),hash.before);assert.equal(sha(after),hash.after);
 for(const [state,bytes]of [['baseline',before],['candidate',after]]){fs.mkdirSync(dir+'/'+state,{recursive:true});fs.writeFileSync(dir+'/'+state+'/'+f,bytes);}
}
const a=read(dir+'/baseline/package-lock.json'),b=read(dir+'/candidate/package-lock.json');
assert.deepEqual([...new Set([...Object.keys(a.packages),...Object.keys(b.packages)])].filter(k=>JSON.stringify(a.packages[k])!==JSON.stringify(b.packages[k])).sort(),s.allowedLockChanges);
for(const [k,p]of Object.entries(b.packages))if(k){assert(p.resolved.startsWith('https://registry.npmjs.org/'));assert(/^sha512-[A-Za-z0-9+/=]+$/.test(p.integrity));}
for(const [k,v]of Object.entries(s.versions))assert.equal(b.packages[k].version,v);
const docker=(...a)=>run('docker',a);
assert.equal(docker('image','inspect','--format','{{.Id}}',s.base),s.base);
const common=['run','--rm','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1g','--memory-swap','1g','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/work:rw,exec,size=512m','--tmpfs','/tmp:rw,size=32m'];
if(phase==='prepare'&&fs.existsSync(dir+'/prepare.json')){
 const p=read(dir+'/prepare.json');assert(p.passed&&p.deploymentAllowed===false&&p.productionChanged===false);assert.equal(p.lockSha256,s.files['package-lock.json'].after);
 assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),p.imageId);
 const checked=read(dir+'/check.json');assert(checked.passed&&checked.imageId===p.imageId&&checked.scans[1].highCritical===0);
 // This is reuse of recorded evidence, not a fresh advisory-data assessment.
 console.log(key+' already prepared and checked; no build, rollout or fresh security claim.');process.exit(0);
}
if(phase==='download'||phase==='prepare'){
 assert(!fs.existsSync(dir+'/'+phase+'.json'),'Preserve completed receipt');
 if(phase==='prepare')assert.equal(read(dir+'/download.json').lockSha256,s.files['package-lock.json'].after);
 for(const state of ['baseline','candidate']){
  const text=docker(...common,'--network',phase==='download'?'bridge':'none','-v',dir+'/'+state+':/input:ro','-v',dir+'/'+state+':/output','-v',root+'/cache:/cache',spec.compiler,'sh','-ec',
   'mkdir /work/app; cd /work/app; cp /input/package*.json .; npm ci '+(phase==='prepare'?'--offline ':'')+'--ignore-scripts --no-audit --no-fund --cache=/cache; npm ls --all --omit=dev; '+(phase==='prepare'?'tar -czf /output/modules.tar.gz node_modules':'true'));
  fs.writeFileSync(dir+'/'+state+'-'+phase+'.log',text);
 }
 const record={date:new Date().toISOString(),passed:true,lockSha256:s.files['package-lock.json'].after,productionChanged:false,deploymentAllowed:false,network:phase==='download'?'registry.npmjs.org; lifecycle scripts disabled':'none'};
 if(phase==='prepare'){
  const context=fs.mkdtempSync(dir+'/image-');try{
   fs.copyFileSync(dir+'/candidate/modules.tar.gz',context+'/modules.tar.gz');
   for(const f of ['package.json','package-lock.json'])fs.copyFileSync(dir+'/candidate/'+f,context+'/'+f);
   const old=JSON.parse(docker('image','inspect','--format','{{json .Config}}',s.base));assert(old.User);
   const baseDir=key==='grist'?'language-final/grist':'npm-leaves',dest=key==='grist'?'/opt/utilibre-grist-reviewed-leaves':'/opt/utilibre-reviewed-leaves';
   fs.copyFileSync(repo+'/deployment/maintenance/'+baseDir+'/replace.cjs',context+'/replace.cjs');
   if(key==='actual')fs.copyFileSync(repo+'/deployment/maintenance/npm-leaves/actual-privacy.cjs',context+'/privacy.cjs');
   fs.writeFileSync(context+'/Dockerfile',`FROM ${s.base}\nUSER 0\nADD modules.tar.gz ${dest}/\nCOPY package*.json ${dest}/\nCOPY replace.cjs /tmp/replace.cjs\n${key==='actual'?'COPY privacy.cjs /tmp/privacy.cjs\n':''}RUN node /tmp/replace.cjs ${key} && rm /tmp/replace.cjs${key==='actual'?' && node /tmp/privacy.cjs && rm /tmp/privacy.cjs':''}\nUSER ${old.User}\n`);
   fs.writeFileSync(dir+'/image.log',run('docker',['build','--network','none','--pull=false','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}}));
   record.imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(JSON.parse(docker('image','inspect','--format','{{json .Config}}',record.imageId)),old);
  }finally{fs.rmSync(context,{recursive:true});}
 }
 fs.writeFileSync(dir+'/'+phase+'.json',JSON.stringify(record,null,2)+'\n');
}else{
 const p=read(dir+'/prepare.json');assert(p.passed&&p.deploymentAllowed===false);assert.equal(docker('image','inspect','--format','{{.Id}}',s.candidate),p.imageId);
 const fixture=fs.mkdtempSync(dir+'/tls-');try{
  run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost']);
  const rows=[];
  for(const state of ['baseline','candidate']){
   const script=`mkdir /work/app; cd /work/app; tar -xzf /input/modules.tar.gz; node /checks/redirects-check.cjs /work/app/node_modules/follow-redirects ${state==='candidate'?'fixed':'baseline'} > /output/redirect.json; ${key==='kuma'?'':'node /old-checks/undici-native.cjs /work/app/node_modules/undici > /output/undici.json; '}${key==='actual'?'node /old-checks/body-native.cjs /work/app/node_modules/body-parser normal > /output/body-normal.json; set +e; node /old-checks/body-native.cjs /work/app/node_modules/body-parser regression > /output/body-regression.log 2>&1; echo $? > /output/body-exit.txt;':''}`;
   docker(...common,'--network','none','-v',dir+'/'+state+':/input:ro','-v',dir+'/'+state+':/output','-v',fixture+':/fixture:ro','-v',here+':/checks:ro','-v',here+'../security-20261028:/old-checks:ro',spec.compiler,'sh','-ec',script);
   const r=read(dir+'/'+state+'/redirect.json');assert(r.passed&&r.sameOriginPreserved&&r.redirectLimit);assert.equal(r.observations.filter(o=>o.credentialForwarded).length,state==='baseline'?2:0);
   const proof={state,redirect:r};
   if(key!=='kuma'){const u=read(dir+'/'+state+'/undici.json');assert(u.normalPassed&&u.checks===7);assert.equal(u.customTlsPinRejected,state==='candidate');assert.equal(u.customTlsCallbackCalled,state==='candidate');proof.undici=u;}
   if(key==='actual'){assert.equal(read(dir+'/'+state+'/body-normal.json').normalChecks,7);const exit=Number(fs.readFileSync(dir+'/'+state+'/body-exit.txt')),log=fs.readFileSync(dir+'/'+state+'/body-regression.log','utf8');assert.equal(exit,state==='baseline'?1:0);assert(state==='baseline'?log.includes("Unhandled 'error' event")&&log.includes('Z_DATA_ERROR'):log.includes('BODY_PARSER_TRAILING_BYTES_SURVIVED'));proof.body={normalChecks:7,regressionExit:exit};}
   rows.push(proof);
  }
  const native=key==='grist'?'language-final/grist/native.cjs':'npm-leaves/check-'+key+(key==='actual'?'-leaves':'')+'.cjs';
  const text=docker(...common,'--network','none','-v',repo+'/deployment/maintenance/'+native+':/native.cjs:ro','--entrypoint','node',p.imageId,'/native.cjs','--lock-nov4');fs.writeFileSync(dir+'/consumer.log',text);
  const scans=[];for(const state of ['baseline','candidate']){
   const file=dir+'/'+state+'-scan.json';run('/opt/utilibre/maintenance/bin/trivy',['fs','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','1m','--no-progress','--format','json','--output',file,dir+'/'+state],{env:{PATH:'/usr/bin:/bin',TRIVY_SKIP_VERSION_CHECK:'true'}});
   const r=read(file);assert(r.Results.some(r=>r.Type==='npm'));const findings=r.Results.flatMap(r=>r.Vulnerabilities||[]);scans.push({state,sha256:sha(fs.readFileSync(file)),highCritical:findings.filter(v=>['HIGH','CRITICAL'].includes(v.Severity)).length,advisories:findings.map(v=>v.VulnerabilityID)});
  }
  assert.equal(scans[0].highCritical,s.priorHigh);assert.equal(scans[1].highCritical,0);
  fs.writeFileSync(dir+'/check.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:p.imageId,rows,consumerCheck:native,scans,dbSha256:sha(fs.readFileSync('/var/cache/utilibre-security/db/trivy.db')),network:'none',productionChanged:false,deploymentAllowed:false,limitation:'Intermediate dependency consumer image, not a deployable replacement for later runtime repairs.'},null,2)+'\n');
 }finally{fs.rmSync(fixture,{recursive:true});}
}
console.log(key+' '+phase+' passed; production unchanged.');

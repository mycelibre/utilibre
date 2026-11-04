// Replay a corrected canonical lock, not an application deployment or updater.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/security-20261103/pairdrop-lock';
const spec=JSON.parse(fs.readFileSync(root+'/deployment/community/pairdrop-security/lock-replay.json'));
const mode=process.argv[2];assert(['download','prepare'].includes(mode)&&process.argv.length===3);
assert(spec.deploymentAllowed===false);assert(/^[a-f0-9]{40}$/.test(spec.baselineCommit));
const sha=b=>createHash('sha256').update(b).digest('hex');
fs.mkdirSync(dir,{recursive:true,mode:0o700});assert(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize>8*1024**3);
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...o});}catch(e){fs.writeFileSync(dir+'/'+mode+'-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('PairDrop lock check failed; private evidence retained');}};
const old=run('git',['show',spec.baselineCommit+':deployment/community/pairdrop-security/package-lock.json']);assert.equal(sha(old),spec.baselineLockSha256);
const pkg=fs.readFileSync(root+'/deployment/community/pairdrop-security/package.json'),lock=fs.readFileSync(root+'/deployment/community/pairdrop-security/package-lock.json');
assert.equal(sha(pkg),spec.packageSha256);assert.equal(sha(lock),spec.lockSha256);
const a=JSON.parse(old),b=JSON.parse(lock);assert.deepEqual(Object.keys(a.packages),Object.keys(b.packages));
for(const [name,p]of Object.entries(b.packages))if(name){assert(p.resolved.startsWith('https://registry.npmjs.org/'));assert(/^sha512-[A-Za-z0-9+/=]+$/.test(p.integrity));}
const path='node_modules/body-parser';assert.equal(b.packages[path].version,spec.version);
for(const k of Object.keys(a.packages))if(k!==path)assert.deepEqual(a.packages[k],b.packages[k]);
for(const k of ['dependencies','engines','license'])assert.deepEqual(a.packages[path][k],b.packages[path][k]);
for(const k of Object.keys(a))if(k!=='packages')assert.deepEqual(a[k],b[k]);
fs.writeFileSync(dir+'/package.json',pkg);fs.writeFileSync(dir+'/package-lock.json',lock);
assert.equal(run('docker',['image','inspect','--format','{{.Id}}',spec.base]).trim(),spec.base);
if(mode==='download'){
 assert(!fs.existsSync(dir+'/download.json'),'Preserve completed acquisition');
 const script='mkdir /work/app; cd /work/app; cp /input/package*.json .; npm ci --ignore-scripts --no-audit --no-fund --cache=/cache; npm ls --all --omit=dev';
 const text=run('docker',['run','--rm','--network','bridge','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--memory-swap','512m','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/work:rw,exec,size=128m','--tmpfs','/tmp:rw,size=16m','-v',dir+':/input:ro','-v',dir+'/npm-cache:/cache','--entrypoint','sh',spec.compiler,'-ec',script]);
 fs.writeFileSync(dir+'/download.log',text);fs.writeFileSync(dir+'/download.json',JSON.stringify({date:new Date().toISOString(),lockSha256:spec.lockSha256,registry:'https://registry.npmjs.org',installScripts:false,passed:true})+'\n');
}else{
 assert(!fs.existsSync(dir+'/prepare.json'),'Preserve completed preparation');assert.equal(JSON.parse(fs.readFileSync(dir+'/download.json')).lockSha256,spec.lockSha256);
 const script='mkdir /work/app; cd /work/app; cp /input/package*.json .; npm ci --offline --ignore-scripts --no-audit --no-fund --cache=/cache; npm ls --all --omit=dev; tar -czf /output/node_modules.tar.gz node_modules';
 const text=run('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--memory-swap','512m','--cpus','1','--pids-limit','64','--log-driver','none','--tmpfs','/work:rw,exec,size=128m','--tmpfs','/tmp:rw,size=16m','-v',dir+':/input:ro','-v',dir+':/output','-v',dir+'/npm-cache:/cache','--entrypoint','sh',spec.compiler,'-ec',script]);fs.writeFileSync(dir+'/prepare.log',text);
 const context=fs.mkdtempSync(dir+'/context-');try{
  for(const f of ['node_modules.tar.gz','package-lock.json'])fs.copyFileSync(dir+'/'+f,context+'/'+f);
  const config=JSON.parse(run('docker',['image','inspect','--format','{{json .Config}}',spec.base]));assert.equal(config.WorkingDir,'/home/node/app');assert(config.User);
  fs.writeFileSync(context+'/Dockerfile',`FROM ${spec.base}\nUSER 0\nRUN rm -rf node_modules\nADD node_modules.tar.gz /home/node/app/\nCOPY package-lock.json /home/node/app/\nUSER ${config.User}\n`);
  fs.writeFileSync(dir+'/image.log',run('docker',['build','--network','none','--pull=false','-t',spec.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}}));
  const imageId=run('docker',['image','inspect','--format','{{.Id}}',spec.candidate]).trim();assert.deepEqual(JSON.parse(run('docker',['image','inspect','--format','{{json .Config}}',imageId])),config);
  const rows=[];for(const [state,image]of [['baseline',spec.base],['candidate',imageId]])for(const test of ['normal','regression']){
   const r=cp.spawnSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--cpus','1','--pids-limit','32','--log-driver','none','-v',root+'/deployment/maintenance/security-20261028/body-native.cjs:/test.cjs:ro','--entrypoint','node',image,'/test.cjs','/home/node/app/node_modules/body-parser',test],{encoding:'utf8',timeout:15000,maxBuffer:1024**2});
   fs.writeFileSync(dir+'/'+state+'-'+test+'.log',r.stdout+r.stderr+String(r.error||''));assert(!r.error&&!r.signal);
   if(state==='baseline'&&test==='regression')assert(r.status===1&&r.stderr.includes("Unhandled 'error' event")&&r.stderr.includes('Z_DATA_ERROR'));
   else {assert.equal(r.status,0);assert(test==='normal'?JSON.parse(r.stdout).normalChecks===7:r.stdout.includes('BODY_PARSER_TRAILING_BYTES_SURVIVED'));}
   rows.push({state,test,exitCode:r.status,passed:true});
  }
  fs.writeFileSync(dir+'/prepare.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId,base:spec.base,lockSha256:spec.lockSha256,rows,network:'none',productionChanged:false,deploymentAllowed:false},null,2)+'\n');
 }finally{fs.rmSync(context,{recursive:true});}
}
console.log('PairDrop '+mode+' passed; no production change.');

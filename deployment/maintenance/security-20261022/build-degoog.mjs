import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/security-20261022/degoog',origin='/opt/utilibre/community-src/degoog',commit='4a9bcc74f0fceaa33efbab4777f063274cce23d6',base='sha256:c0ef68a99e6140dddfd306f4c87ced31fccb20d7ed7d9025877b847cfb7ef740',container='utilibre-evaluation-degoog-1',candidate='utilibre-degoog:1.0.0-dom3417-security-20261022';
process.umask(0o077);fs.mkdirSync(dir,{recursive:true,mode:0o700});
assert(process.argv.slice(2).every(f=>['--resolve','--stage'].includes(f))&&process.argv.length<=3);
const run=(exe,args,opts={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('DeGoog candidate failed; private diagnostic retained');}};
const docker=(args,opts)=>run('docker',args,opts),sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
assert.equal(docker(['inspect','--format','{{.Image}}',container]).trim(),base);
if(process.argv.includes('--stage')){
 const b=JSON.parse(fs.readFileSync(dir+'/client-build.json'));assert(b.passed&&b.base===base);assert.equal(sha(dir+'/client.tar.gz'),b.archiveSha256);
 const config=id=>JSON.parse(docker(['image','inspect','--format','{{json .Config}}',id])),old=config(base);
 fs.writeFileSync(dir+'/Dockerfile',`FROM ${base}\nUSER 0\nRUN rm -r /app/node_modules/dompurify\nADD client.tar.gz /app/\nUSER ${JSON.stringify(old.User)}\n`);
 docker(['build','--network','none','--pull=false','-t',candidate,dir],{timeout:180000,env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker(['image','inspect','--format','{{.Id}}',candidate]).trim();assert.deepEqual(config(imageId),old);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({key:'degoog',date:new Date().toISOString(),passed:true,base,container,candidate,imageId,configurationUnchanged:true,productionChanged:false},null,2));console.log(JSON.stringify({candidate,imageId}));
}else{
 const source=fs.mkdtempSync('/dev/shm/utilibre-degoog-source-');
 try{
  run('git',['-C',origin,'archive','--format=tar','--output='+dir+'/input.tar',commit]);run('tar',['-xf',dir+'/input.tar','-C',source]);
  const resolve=process.argv.includes('--resolve');
  const log=docker(['run','--rm','--name','maintenance-degoog-dom','--user','0','--cpus','2','--memory','2g','--memory-swap','2g','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=1536m','--tmpfs','/tmp:rw,size=32m','-v',source+':/source:ro','-v',root+'/deployment/maintenance/security-20261022:/recipe:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','RESOLVE_LOCK='+(resolve?'1':'0'),'--entrypoint','sh',base,'/recipe/build-degoog.sh'],{timeout:600000});
  fs.writeFileSync(dir+(resolve?'/resolve.log':'/build.log'),log);
  if(!resolve){const r={date:new Date().toISOString(),passed:true,base,sourceCommit:commit,bun:'1.3.14',dompurify:'3.4.17',inputSha256:sha(dir+'/input.tar'),lockSha256:sha(dir+'/bun.lock'),archiveSha256:sha(dir+'/client.tar.gz')};fs.writeFileSync(dir+'/client-build.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
 }finally{assert(source.startsWith('/dev/shm/utilibre-degoog-source-'));fs.rmSync(source,{recursive:true,force:true});}
}

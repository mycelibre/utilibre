// Two reviewed client rebuilds. Runtime dependencies and backend fixes stay intact.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/home/ubuntu/freetools',output='/var/lib/utilibre-maintenance/security-20261022';
export const clients={
 candlr:{source:'/opt/utilibre/evaluation-src/candlr-20261011/frontend',git:'/opt/utilibre/evaluation-src/candlr-20261011',commit:'c8ac0eb11703e92c6daa3ad7908f2f219265e1a3',base:'sha256:c90793134becd0f214b8ed9d41e54cece1c9ba3fded056f3e5dac5c184a033e2',container:'utilibre-records-candlr-1',candidate:'utilibre-candlr:2.0.0-dom3417-security-20261022',app:'/app/frontend'},
 markmap:{source:root+'/deployment/toolbox/markmap',container:'utilibre-browser-tools-markmap-1',candidate:'utilibre-markmap:0.18.12-dom3417-security-20261022',app:'/usr/share/nginx/html'},
};
const [key,...flags]=process.argv.slice(2),s=clients[key];assert(s&&flags.every(f=>['--resolve','--stage'].includes(f))&&flags.length<=1);
process.umask(0o077);const dir=output+'/'+key;fs.mkdirSync(dir,{recursive:true,mode:0o700});
const run=(exe,args,opts={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': private build diagnostic retained');}};
const docker=(args,opts)=>run('docker',args,opts),sha=x=>createHash('sha256').update(x).digest('hex');
const live=docker(['inspect','--format','{{.Image}}',s.container]).trim();
if(s.base)assert.equal(live,s.base);else{
 const parent=JSON.parse(fs.readFileSync(output+'/nginx/artifacts-release.json'));
 const group=parent.rows.find(g=>g.name===s.container);assert(group&&group.status==='passed');assert.equal(group.newImage,live);s.base=live;
}
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
if(s.git)assert.equal(run('git',['-C',s.git,'rev-parse','HEAD']).trim(),s.commit);
if(flags.includes('--stage')){
 const b=JSON.parse(fs.readFileSync(dir+'/client-build.json'));assert(b.passed&&b.base===s.base);
 for(const file of ['dist.tar.gz','dompurify.tar.gz'])assert.equal(sha(fs.readFileSync(dir+'/'+file)),b.archives[file]);
 const cfg=id=>JSON.parse(docker(['image','inspect','--format','{{json .Config}}',id]));
 const old=cfg(s.base);assert(old.User);
 // Only immutable application output; no uploaded files or browser data here.
 const recipe=key==='candlr'?`RUN rm -r /app/frontend/dist /app/frontend/node_modules/dompurify\nADD dist.tar.gz /app/frontend/\nADD dompurify.tar.gz /app/frontend/\n`:`RUN rm -r /usr/share/nginx/html\nADD dist.tar.gz /tmp/utilibre-markmap/\nRUN mv /tmp/utilibre-markmap/dist /usr/share/nginx/html && rmdir /tmp/utilibre-markmap\n`;
 fs.writeFileSync(dir+'/Dockerfile',`FROM ${s.base}\nUSER 0\n${recipe}USER ${JSON.stringify(old.User)}\n`);
 docker(['build','--network','none','--pull=false','-t',s.candidate,dir],{timeout:180000,env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker(['image','inspect','--format','{{.Id}}',s.candidate]).trim();assert.deepEqual(cfg(imageId),old);
 const result={...s,key,date:new Date().toISOString(),imageId,passed:true,configurationUnchanged:true,productionChanged:false};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}else{
 const resolve=flags.includes('--resolve'),compiler='node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1';
 const log=run('docker',['run','--rm','--name','maintenance-dom-'+key,'--cpus','2','--memory','4g','--memory-swap','4g','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=3g','--tmpfs','/tmp:rw,size=32m','-v',s.source+':/source:ro','-v',root+'/deployment/maintenance/security-20261022:/recipe:ro','-v',root+'/portal/public/brand:/branding:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','APPLICATION='+key,'-e','RESOLVE_LOCK='+(resolve?'1':'0'),compiler,'sh','/recipe/build-dom-client.sh'],{timeout:15*60*1000});
 fs.writeFileSync(dir+(resolve?'/resolve.log':'/build.log'),log);
 if(resolve){const a=JSON.parse(fs.readFileSync(s.source+'/package-lock.json')),b=JSON.parse(fs.readFileSync(dir+'/package-lock.json'));const changed=Object.keys(b.packages).filter(k=>JSON.stringify(a.packages[k])!==JSON.stringify(b.packages[k])),removed=Object.keys(a.packages).filter(k=>!(k in b.packages));assert(changed.every(k=>['','node_modules/dompurify'].includes(k)));assert.equal(removed.length,0);console.log(JSON.stringify({key,changed,removed}));}
 else{const r={date:new Date().toISOString(),passed:true,base:s.base,compiler,dompurify:'3.4.17',sourceCommit:s.commit||null,sourcePatchSha256:s.git?sha(run('git',['-C',s.git,'diff','HEAD','--binary'])):null,lockSha256:sha(fs.readFileSync(dir+'/package-lock.json')),archives:Object.fromEntries(['dist.tar.gz','dompurify.tar.gz'].map(f=>[f,sha(fs.readFileSync(dir+'/'+f))]))};fs.writeFileSync(dir+'/client-build.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
}

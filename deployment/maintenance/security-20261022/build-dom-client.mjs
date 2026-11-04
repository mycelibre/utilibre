// Two reviewed client rebuilds. Runtime dependencies and backend fixes stay intact.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const november=process.argv.includes('--nov4'),replay=process.argv.includes('--replay');process.argv=process.argv.filter(a=>!['--nov4','--replay'].includes(a));
const root='/home/ubuntu/freetools',output='/var/lib/utilibre-maintenance/security-'+(november?'20261103':'20261022');
const novemberInput=november?JSON.parse(fs.readFileSync(new URL('../security-20261103/markmap-inputs.json',import.meta.url))):null;
export const clients={
 candlr:{source:'/opt/utilibre/evaluation-src/candlr-20261011/frontend',git:'/opt/utilibre/evaluation-src/candlr-20261011',commit:'c8ac0eb11703e92c6daa3ad7908f2f219265e1a3',base:'sha256:c90793134becd0f214b8ed9d41e54cece1c9ba3fded056f3e5dac5c184a033e2',container:'utilibre-records-candlr-1',candidate:'utilibre-candlr:2.0.0-dom3417-security-20261022',app:'/app/frontend'},
 markmap:{source:root+'/deployment/toolbox/markmap',container:'utilibre-browser-tools-markmap-1',candidate:'utilibre-markmap:0.18.12-dom3417-security-20261022',app:'/usr/share/nginx/html'},
};
const [key,...flags]=process.argv.slice(2),s=clients[key];assert(s&&flags.every(f=>['--resolve','--stage'].includes(f))&&flags.length<=1);
assert(!replay||(november&&key==='markmap'&&flags.length===0),'Replay only builds the recorded Markmap source; no resolution or image staging');
if(november){assert.equal(key,'markmap');Object.assign(s,novemberInput);}
process.umask(0o077);const dir=replay?fs.mkdtempSync(output+'/markmap-replay-'):output+'/'+key;fs.mkdirSync(dir,{recursive:true,mode:0o700});
const run=(exe,args,opts={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': private build diagnostic retained');}};
const docker=(args,opts)=>run('docker',args,opts),sha=x=>createHash('sha256').update(x).digest('hex');
if(replay){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>9*1024**3);
 const original=output+'/markmap';assert.equal(sha(fs.readFileSync(original+'/package.json')),s.approvedPackageSha256);assert.equal(sha(fs.readFileSync(original+'/package-lock.json')),s.approvedLockSha256);
 for(const f of ['package.json','package-lock.json'])fs.copyFileSync(original+'/'+f,dir+'/'+f);
 fs.cpSync(original+'/npm-cache',dir+'/npm-cache',{recursive:true});
}
if(november){
 assert(/^[a-f0-9]{40}$/.test(s.sourceCommit)&&s.sourceTree==='deployment/toolbox/markmap');
 s.source=dir+'/source-input';
 if(!fs.existsSync(s.source)){fs.mkdirSync(s.source);const archive=run('git',['-C',root,'archive','--format=tar',s.sourceCommit+':'+s.sourceTree],{encoding:null});run('tar',['-xf','-','-C',s.source],{input:archive,stdio:['pipe','pipe','pipe']});}
 const files=(d,p='')=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name,p+e.name+'/'):(assert(e.isFile(),'Nonregular source entry'),[p+e.name]));assert.deepEqual(files(s.source).sort(),Object.keys(s.sourceFiles).sort(),'Unexpected source entry');
 for(const [name,hash]of Object.entries(s.sourceFiles))assert.equal(sha(fs.readFileSync(s.source+'/'+name)),hash,'Source changed: '+name);
}
const live=november?docker(['image','inspect','--format','{{.Id}}',s.base]).trim():docker(['inspect','--format','{{.Image}}',s.container]).trim();
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
 const context=november?fs.mkdtempSync(dir+'/image-context-'):dir;
 try{if(november)for(const f of ['Dockerfile','dist.tar.gz','dompurify.tar.gz'])fs.copyFileSync(dir+'/'+f,context+'/'+f);docker(['build','--network','none','--pull=false','-t',s.candidate,context],{timeout:180000,env:{...process.env,DOCKER_BUILDKIT:'0'}});}finally{if(november)fs.rmSync(context,{recursive:true});}
 const imageId=docker(['image','inspect','--format','{{.Id}}',s.candidate]).trim();assert.deepEqual(cfg(imageId),old);
 const result={...s,key,date:new Date().toISOString(),imageId,passed:true,configurationUnchanged:true,productionChanged:false};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}else{
 const resolve=flags.includes('--resolve');if(november){assert(!fs.existsSync(dir+'/client-build.json'),'Preserve completed candidate');fs.mkdirSync(dir+'/npm-cache',{recursive:true});}const compiler='node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1';
 const log=run('docker',['run','--rm',...(november?['--network',resolve?'bridge':'none','-v',dir+'/npm-cache:/cache','-e','MAINTENANCE_NOV4=1']:[]),'--name','maintenance-dom-'+key,'--cpus','2','--memory','4g','--memory-swap','4g','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/work:rw,exec,size=3g','--tmpfs','/tmp:rw,size=32m','-v',s.source+':/source:ro','-v',root+'/deployment/maintenance/security-20261022:/recipe:ro','-v',root+'/portal/public/brand:/branding:ro','-v',dir+':/output','-v',dir+':/lock:ro','-e','APPLICATION='+key,'-e','RESOLVE_LOCK='+(resolve?'1':'0'),compiler,'sh','/recipe/build-dom-client.sh'],{timeout:15*60*1000});
 fs.writeFileSync(dir+(resolve?'/resolve.log':'/build.log'),log);
 if(resolve){const a=JSON.parse(fs.readFileSync(s.source+'/package-lock.json')),b=JSON.parse(fs.readFileSync(dir+'/package-lock.json'));const changed=Object.keys(b.packages).filter(k=>JSON.stringify(a.packages[k])!==JSON.stringify(b.packages[k])),removed=Object.keys(a.packages).filter(k=>!(k in b.packages));assert(changed.every(k=>(november?['','node_modules/markdown-it','node_modules/undici']:['','node_modules/dompurify']).includes(k)));if(november){
 for(const[n,v]of Object.entries(s.packages))assert.equal(b.packages['node_modules/'+n].version,v);
 assert.equal(sha(fs.readFileSync(dir+'/package-lock.json')),s.approvedLockSha256,'Resolved graph differs from approved lock');assert.equal(sha(fs.readFileSync(dir+'/package.json')),s.approvedPackageSha256);
 fs.mkdirSync(dir+'/dependencies',{recursive:true});
 for(const [state,lock]of [['baseline',a],['candidate',b]]){fs.mkdirSync(dir+'/dependencies/'+state,{recursive:true});fs.writeFileSync(dir+'/dependencies/'+state+'/package-lock.json',JSON.stringify(lock,null,2)+'\n');}
 for(const p of s.dependencyArchives){assert(['baseline','candidate'].includes(p.state)&&['markdown-it','undici'].includes(p.name));const lock=(p.state==='baseline'?a:b).packages['node_modules/'+p.name];assert.equal(p.version,lock.version);assert.equal(p.integrity,lock.integrity);assert.equal(p.url,lock.resolved);assert(p.url.startsWith('https://registry.npmjs.org/'+p.name+'/'));assert.equal(p.file,p.name+'-'+p.version+'.tgz');const file=dir+'/dependencies/'+p.file;if(!fs.existsSync(file))run('curl',['-fsSL','--max-time','30','--max-filesize','4194304',p.url,'-o',file]);assert.equal(sha(fs.readFileSync(file)),p.sha256);assert.equal('sha512-'+createHash('sha512').update(fs.readFileSync(file)).digest('base64'),p.integrity);}
 fs.writeFileSync(dir+'/dependency-inputs.json',JSON.stringify(s.dependencyArchives,null,2)+'\n');
}assert.equal(removed.length,0);console.log(JSON.stringify({key,changed,removed}));}
 else{const r={date:new Date().toISOString(),passed:true,base:s.base,compiler,dompurify:'3.4.17',sourceCommit:november?s.sourceCommit:s.commit||null,sourcePatchSha256:s.git?sha(run('git',['-C',s.git,'diff','HEAD','--binary'])):null,lockSha256:sha(fs.readFileSync(dir+'/package-lock.json')),...(november?{packageSha256:sha(fs.readFileSync(dir+'/package.json')),packages:s.packages,offlineBuild:true}:{}),archives:Object.fromEntries(['dist.tar.gz','dompurify.tar.gz'].map(f=>[f,sha(fs.readFileSync(dir+'/'+f))]))};fs.writeFileSync(dir+'/client-build.json',JSON.stringify(r,null,2));console.log(JSON.stringify(r));}
}

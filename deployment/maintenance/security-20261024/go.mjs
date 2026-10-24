// Bounded extension of go-leaf-final: preserve source, frontend and base image;
// resolve once, then compile/test without network. No activation here.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261024',here=new URL('.',import.meta.url).pathname;
const [key,phase]=process.argv.slice(2);assert(['opengist','vikunja'].includes(key)&&['resolve','build','stage'].includes(phase));
const old=JSON.parse(fs.readFileSync(new URL('../go-leaf-final/images.json',import.meta.url))).find(s=>s.key===key);
const dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});
const run=(exe,args,options={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...options});}catch(e){fs.writeFileSync(dir+'/'+phase+'-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+' '+phase+' failed; private diagnostic retained');}};
const docker=(...args)=>run('docker',args).trim(),sha=b=>createHash('sha256').update(b).digest('hex');
const base={opengist:'sha256:56983d2fd6e04dab73ac9700eee38dde8f48f825ac904253c062f1a6e76e1876',vikunja:'sha256:93940c5912509273d2ce7eb5323eee3fd9473798c2c596085a497374c0dcb2d8'}[key];
const tag='utilibre-'+key+':echo-security-20261024';
assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Disk reserve');
if(phase==='resolve'){
 assert.equal(run('git',['-C',old.source,'rev-parse','HEAD']).trim(),old.commit);
 assert.equal(run('git',['-C',old.source,'status','--porcelain']).trim(),'');
 fs.writeFileSync(dir+'/source.tar',run('git',['-C',old.source,'archive',old.commit],{encoding:null,maxBuffer:100*1024**2}));
 const compiler=JSON.parse(fs.readFileSync(here+'images.json')).find(s=>s.key===key).compilerImage;
 assert.equal(docker('image','inspect','--format','{{.Id}}',compiler),compiler);
 fs.writeFileSync(dir+'/inputs.json',JSON.stringify({key,base,tag,compiler,sourceCommit:old.commit,sourceSha256:sha(fs.readFileSync(dir+'/source.tar')),binary:old.binary,source:old.source},null,2));
}
const input=JSON.parse(fs.readFileSync(dir+'/inputs.json'));assert.equal(input.base,base);
assert.equal(sha(fs.readFileSync(dir+'/source.tar')),input.sourceSha256);
if(phase==='build'){
 const locks=JSON.parse(fs.readFileSync(dir+'/locks.json'));
 for(const f of Object.keys(locks))assert.equal(sha(fs.readFileSync(dir+'/'+f)),locks[f],'Changed input lock');
 if(fs.existsSync(dir+'/compiled.json')){
  const previous=JSON.parse(fs.readFileSync(dir+'/compiled.json'));
  if(previous.passed&&previous.compiler===input.compiler&&previous.sourceSha256===input.sourceSha256&&JSON.stringify(previous.locks)===JSON.stringify(locks)&&sha(fs.readFileSync(dir+'/binary'))===previous.binarySha256){
   console.log(key+': existing exact compilation reverified; no rebuild');process.exit(0);
  }
 }
}
if(phase!=='stage'){
 fs.mkdirSync(root+'/modules',{recursive:true});
 const args=['run','--rm','--name','maintenance-echo-'+key,'--network',phase==='resolve'?'bridge':'none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','2','--memory','4g','--memory-swap','4g','--pids-limit','256','--tmpfs','/work:rw,exec,size=3g,mode=1777','--tmpfs','/tmp:rw,size=16m','-v',dir+':/input','-v',root+'/modules:/modules'+(phase==='resolve'?'':':ro'),'-v',here+':/scripts:ro','-v',new URL('../go-leaf-final/locks/'+key,import.meta.url).pathname+':/previous:ro','-v','/var/lib/utilibre-maintenance/go-leaf-final-20261011/input/'+key+'-embed:/assets:ro',input.compiler,'sh','/scripts/go-build.sh',key,phase];
 // Snapshot the script before executing: a repository edit during a long build
 // must not change the shell's instruction stream.
 args.splice(-4,4,'sh','-c','cp /scripts/go-build.sh /work/build.sh && exec sh /work/build.sh "$@"','build',key,phase);
 const log=run('docker',args,{timeout:1200000,maxBuffer:8*1024**2});fs.writeFileSync(dir+'/'+phase+'.log',log);
 if(phase==='resolve')fs.writeFileSync(dir+'/locks.json',JSON.stringify(Object.fromEntries(['go.mod','go.sum'].map(f=>[f,sha(fs.readFileSync(dir+'/'+f))])),null,2));
 else{
  const locks=JSON.parse(fs.readFileSync(dir+'/locks.json'));for(const f of Object.keys(locks))assert.equal(sha(fs.readFileSync(dir+'/'+f)),locks[f]);
  fs.writeFileSync(dir+'/compiled.json',JSON.stringify({...input,date:new Date().toISOString(),passed:true,network:'none',binarySha256:sha(fs.readFileSync(dir+'/binary')),locks},null,2));
 }
 console.log(key+': '+phase+' passed');
}else{
 const b=JSON.parse(fs.readFileSync(dir+'/compiled.json'));assert(b.passed&&sha(fs.readFileSync(dir+'/binary'))===b.binarySha256);
 const config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));const original=config(base);
 const stage=dir+'/image';fs.mkdirSync(stage,{recursive:true});fs.copyFileSync(dir+'/binary',stage+'/binary');fs.chmodSync(stage+'/binary',0o755);
 fs.writeFileSync(stage+'/Dockerfile',`FROM ${base}\nCOPY --chown=1000:1000 binary ${old.binary}\n`);
 run('docker',['build','--network','none','--pull=false','-t',tag,stage],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',tag);assert.deepEqual(config(imageId),original);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...b,imageId,candidate:tag,configurationUnchanged:true,deployed:false},null,2));console.log(key+': candidate image '+imageId);
}

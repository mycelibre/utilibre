// Release one already-tested Rallly image; preserve the prior pin and source.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

process.umask(0o077);
const mode=process.argv[2];
assert(['check','apply','rollback'].includes(mode)&&process.argv.length===3);
const root='/var/lib/utilibre-maintenance/security-20261122/rallly-effect';
const compose='/home/ubuntu/freetools/deployment/community/compose.yaml';
const project='/home/ubuntu/freetools/deployment/community';
const publicFile='/opt/utilibre/toolbox-public/rallly-utilibre.tar.gz';
const oldRef='utilibre-openssl-bookworm-community-rallly:20261122';
const newRef='utilibre-rallly:4.15.4-effect3221-permissions-20261122';
const name='utilibre-community-rallly-1';
const oldId='sha256:03ba573731f9b4060ff0e68732ab04cf7ec635049bdb2cab6c1e5f5e6ed72660';
const url='https://poll.utilibre.org/login';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(exe,args,timeout=120000)=>{
 try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}
 catch{throw Error('Rallly release command failed; inspect protected service diagnostics');}
};
const docker=(...args)=>run('docker',args);
const args=['compose','--profile','rallly','--project-directory',project,
 '--env-file',project+'/.env.rallly','-p','utilibre-community',
 '-f',compose];
const config=()=>JSON.parse(docker(...args,'config','--format','json')).services.rallly;
const imageId=()=>docker('inspect','--format','{{.Image}}',name);
const health=()=>docker('inspect','--format','{{.State.Health.Status}}',name);
const replaced=(text,from,to)=>{
 const a='    image: '+from;
 assert.equal(text.split(a).length,2,'Expected exactly one Rallly image pin');
 return text.replace(a,'    image: '+to);
};
const baseline=read(root+'/stage-v2.json');
const native=read(root+'/native.json'),scope=read(root+'/scope-v2.json');
const scan=read(root+'/scan-gate.json'),source=read(root+'/source-capture.json');
assert(baseline.passed&&native.passed&&scope.passed&&scan.passed&&source.passed);
assert([native,scope,scan,source].every(x=>x.imageId===baseline.imageId));
assert.equal(docker('image','inspect','--format','{{.Id}}',newRef),baseline.imageId);
assert.equal(docker('image','inspect','--format','{{.Id}}',oldRef),oldId);
assert.equal(sha(root+'/rallly-utilibre-effect3221.tar.gz'),source.archiveSha256);
const free=fs.statfsSync('/');assert(free.bavail*free.bsize>=8*1024**3,'Root recovery floor');

async function publicHealth(){
 for(let i=0;i<60;i++){
  try{
   if(health()==='healthy'){
    const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});
    await response.body?.cancel();
    if(response.status===200)return;
   }
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
 throw Error('Rallly health or public sign-in path did not recover');
}
function applyPin(from,to){
 const current=fs.readFileSync(compose,'utf8'),next=replaced(current,from,to);
 fs.writeFileSync(compose+'.rallly-effect-tmp',next,{mode:0o644});
 fs.renameSync(compose+'.rallly-effect-tmp',compose);
}
function recreate(){docker(...args,'up','-d','--no-deps','rallly');}
function restoreSource(){
 const previous=root+'/previous-public-source.tar.gz';
 assert.equal(sha(previous),source.previousSourceSha256);
 fs.copyFileSync(previous,publicFile+'.rallly-effect-rollback');
 fs.chmodSync(publicFile+'.rallly-effect-rollback',0o644);
 fs.renameSync(publicFile+'.rallly-effect-rollback',publicFile);
}
const receipt=root+'/release.json';
if(mode==='check'){
 assert(!fs.existsSync(receipt));
 assert.equal(imageId(),oldId);
 assert.equal(health(),'healthy');
 assert.equal(config().image,oldRef);
 assert(fs.readFileSync(compose,'utf8').includes('    image: '+oldRef));
 assert.equal(sha(publicFile),source.previousSourceSha256);
 const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});
 await response.body?.cancel();assert.equal(response.status,200);
 console.log('Rallly release preflight passed; production unchanged');
}else if(mode==='apply'){
 assert(!fs.existsSync(receipt));
 const published=read(root+'/source-publication.json');
 assert(published.passed&&published.imageId===baseline.imageId);
 assert.equal(sha(publicFile),source.archiveSha256);
 assert.equal(imageId(),oldId);assert.equal(config().image,oldRef);
 try{
  applyPin(oldRef,newRef);
  assert.equal(config().image,newRef);
  recreate();
  await publicHealth();
  assert.equal(imageId(),baseline.imageId);
  assert.equal(docker('exec',name,'node','-p',
   'require("/app/node_modules/effect/package.json").version'),'3.22.1');
  fs.writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),passed:true,
   oldRef,oldImage:oldId,newRef,newImage:baseline.imageId,
   sourceSha256:source.archiveSha256,scopePassed:true,nativePassed:true,
   scanPassed:true,publicHealth:200,rollback:'node '+new URL(import.meta.url).pathname+' rollback'},null,2)+'\n',
   {flag:'wx',mode:0o600});
  console.log('Rallly fixed Effect image released; source and public health verified');
 }catch(error){
  try{
   if(config().image===newRef)applyPin(newRef,oldRef);
   recreate();await publicHealth();restoreSource();
  }catch{throw Error('Rallly release failed and automatic rollback needs operator review');}
  throw error;
 }
}else{
 assert.equal(imageId(),baseline.imageId);
 assert.equal(config().image,newRef);
 assert.equal(sha(publicFile),source.archiveSha256);
 applyPin(newRef,oldRef);recreate();await publicHealth();
 assert.equal(imageId(),oldId);
 restoreSource();
 console.log('Rallly prior image and source restored; database unchanged');
}

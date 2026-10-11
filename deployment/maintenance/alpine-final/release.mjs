// Exact-image vendor rollout. Stage checks precede prepare; only image may change.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/alpine-final-20261011',file=dir+'/release.json';
const docker=(...a)=>{try{return execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Docker operation failed; no credential-bearing output emitted.');}};
const inspect=ref=>JSON.parse(docker('inspect',ref))[0];
const definitions=[
 ['utilibre-services-privatebin-1','utilibre-privatebin:2.0.6-php-security-20261011-p3','https://paste.utilibre.org/'],
 ['utilibre-community-ntfy-1','utilibre-ntfy:2.28.0-vendor-security-20261011','https://notify.utilibre.org/v1/health'],
 ['utilibre-kittygram-kittygram-1','utilibre-kittygram:5931c21-vendor-security-20261011-p2','https://gram.utilibre.org/'],
 ['utilibre-evaluation-degoog-1','utilibre-degoog:1.0.0-vendor-security-20261011','https://degoog.utilibre.org/'],
];
const args=r=>['compose','--profile','*','--project-directory',r.cwd,...(r.project==='utilibre-community'?['--env-file',r.cwd+'/.env.rallly']:[]),'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const config=r=>JSON.parse(docker(...args(r),'config','--format','json')).services[r.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
if(process.argv[2]==='prepare'){
 const stage=JSON.parse(await readFile(dir+'/stage.json'));assert.equal(stage.status,'passed');
 const rows=definitions.map(([name,newRef,url])=>{const x=inspect(name),l=x.Config.Labels;
  const r={name,newRef,url,newImage:inspect(newRef).Id,oldRef:x.Config.Image,oldImage:x.Image,project:l['com.docker.compose.project'],service:l['com.docker.compose.service'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(',')};
  assert(stage.rows.some(s=>s.before===r.oldImage&&s.after===r.newImage));assert.equal(config(r).image,r.oldRef);r.configHash=hash(config(r));return r;
 });
 await writeFile(file,JSON.stringify({date:new Date().toISOString(),status:'prepared',rows},null,2)+'\n');
 console.log('Four immutable vendor replacements prepared; no production change.');
}else if(process.argv[2]==='apply'){
 const receipt=JSON.parse(await readFile(file)),save=()=>writeFile(file,JSON.stringify(receipt,null,2)+'\n');
 for(const r of receipt.rows){
  assert.equal(config(r).image,r.newRef);assert.equal(hash(config(r)),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);
  await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async ref=>{
   const x=inspect(ref);if(ref===r.name&&x.State?.Running&&!x.State.Health){
    let good=false;try{const q=await fetch(r.url,{signal:AbortSignal.timeout(5000)});good=q.ok;await q.body?.cancel();}catch{}
    x.State.Health={Status:good?'healthy':'starting'};
   }return x;
  },start:()=>docker(...args(r),'up','-d','--no-deps','--no-build','--pull','never',r.service),rollback:async()=>{
   const rollback=dir+'/rollback-'+r.service+'.json';await writeFile(rollback,JSON.stringify({services:{[r.service]:{image:r.oldRef}}}));
   docker(...args(r),'-f',rollback,'up','-d','--no-deps','--no-build','--pull','never',r.service);
  }});
  const q=await fetch(r.url,{signal:AbortSignal.timeout(20000)});assert(q.ok,r.name+' public endpoint');await q.body?.cancel();
  console.log(r.name+' exact image healthy; public endpoint passed.');
 }
 receipt.status='passed';receipt.completedAt=new Date().toISOString();await save();
}else throw Error('Use prepare or apply');

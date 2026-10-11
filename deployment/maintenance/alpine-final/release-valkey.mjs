// Same-engine vendor patch. Yopass may only restart on an EMPTY cache, checked
// with its writer stopped; no temporary secrets are copied, inspected or lost.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/alpine-final-20261011',file=dir+'/valkey-release.json';
const ref='utilibre-valkey:9.1.1-vendor-security-20261011';
const docker=(...a)=>{try{return execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Docker operation failed; environment/output withheld.');}};
const inspect=r=>JSON.parse(docker('inspect',r))[0];
const names=['utilibre-kittygram-cache-1','utilibre-priviblur-cache-1','utilibre-expanded-penpot-valkey-1','utilibre-community-secret-cache-1','utilibre-services-valkey-1','public-utility-valkey-1'];
const args=r=>['compose','--profile','*','--project-directory',r.cwd,...(r.project==='utilibre-community'?['--env-file',r.cwd+'/.env.rallly']:[]),'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const config=r=>JSON.parse(docker(...args(r),'config','--format','json')).services[r.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
if(process.argv[2]==='prepare'){
 const stage=JSON.parse(await readFile(dir+'/stage.json'));assert.equal(stage.status,'passed');
 const next=inspect(ref).Id;
 const rows=names.map(name=>{const x=inspect(name),l=x.Config.Labels;
  assert(stage.rows.some(s=>s.before===x.Image&&s.after===next));
  const r={name,newRef:ref,newImage:next,oldRef:x.Config.Image,oldImage:x.Image,project:l['com.docker.compose.project'],service:l['com.docker.compose.service'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(',')};
  assert.equal(config(r).image,r.oldRef);r.configHash=hash(config(r));return r;
 });
 await writeFile(file,JSON.stringify({date:new Date().toISOString(),status:'prepared',rows},null,2)+'\n');console.log('Six exact Valkey releases prepared.');
}else if(process.argv[2]==='apply'){
 const receipt=JSON.parse(await readFile(file)),save=()=>writeFile(file,JSON.stringify(receipt,null,2)+'\n');
 for(const r of receipt.rows){
  assert.equal(config(r).image,r.newRef);assert.equal(hash(config(r)),r.configHash);assert.equal(inspect(ref).Id,r.newImage);
  let stopped=false;
  try{
   if(r.name==='utilibre-community-secret-cache-1'&&inspect(r.name).Image===r.oldImage){
    docker('stop','--time','15','utilibre-community-yopass-1');stopped=true;
    assert.equal(docker('exec',r.name,'valkey-cli','DBSIZE').trim(),'0','Encrypted secrets remain: cache replacement refused.');
    r.noSecretLoss='Yopass writer stopped; native DBSIZE zero before replacement';await save();
   }
   await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async name=>{
    const x=inspect(name);if(name===r.name&&x.State?.Running&&!x.State.Health){
     let good=false;try{good=docker('exec',name,'valkey-cli','ping').trim()==='PONG';}catch{}
     x.State.Health={Status:good?'healthy':'starting'};
    }return x;
   },start:()=>docker(...args(r),'up','-d','--no-deps','--no-build','--pull','never',r.service),rollback:async()=>{
    const f=dir+'/rollback-'+r.name+'.json';await writeFile(f,JSON.stringify({services:{[r.service]:{image:r.oldRef}}}));
    docker(...args(r),'-f',f,'up','-d','--no-deps','--no-build','--pull','never',r.service);
   }});
  }finally{if(stopped)docker('start','utilibre-community-yopass-1');}
  console.log(r.name+' healthy on unchanged-engine vendor layer');
 }
 receipt.status='passed';receipt.completedAt=new Date().toISOString();await save();
}else throw Error('Use prepare or apply');

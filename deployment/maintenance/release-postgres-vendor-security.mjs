// Bounded same-engine library rollout, after isolated restore of each native DB.
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const exec=promisify(execFile),dir='/var/lib/utilibre-maintenance/'+(process.argv.includes('--gosu')?'postgres-gosu-20261011':'postgres-vendor-20261011');
async function docker(args){try{return(await exec('docker',args,{timeout:120000,maxBuffer:16*1024**2,env:{...process.env,APP_BIND_IP:'10.10.1.43'}})).stdout;}catch(e){
 // Docker output/config can contain credentials. Store only bounded diagnostics.
 const diagnostic={at:new Date().toISOString(),operation:args[0]==='inspect'?'inspect':'compose',exitCode:Number.isInteger(e.code)?e.code:null,timedOut:e.killed===true};
 await writeFile(dir+'/release-error.log',JSON.stringify(diagnostic)+'\n',{mode:0o600});throw Error('Docker operation failed; private sanitized release diagnostic available.');
}}
const inspect=async name=>JSON.parse(await docker(['inspect',name]))[0];
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,...(r.service==='rallly-db'?['--env-file',r.cwd+'/.env.rallly']:[]),'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const config=async r=>JSON.parse(await docker([...compose(r),'config','--format','json'])).services[r.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const path=dir+'/release.json';

// Injected operations keep failure-path checks completely independent of Docker.
export async function releaseReviewedRow(r,initialImage,ops){
 assert.equal(Boolean(r.rollbackRef),Boolean(r.rollbackImage),'Explicit rollback needs both reference and exact image');
 const rollbackRef=r.rollbackRef||r.oldRef,rollbackImage=r.rollbackImage||r.oldImage;
 if(r.rollbackRef)assert.equal((await ops.inspect(rollbackRef)).Id,rollbackImage,'Reviewed fallback tag changed');
 const delay=ops.delay||(()=>new Promise(resolve=>setTimeout(resolve,1000)));
 async function healthy(image,retryInspectionErrors=false){
  for(let n=0;n<40;n++){
   try{const x=await ops.inspect(r.name);if(x.Image===image&&x.State?.Running&&x.State.Health?.Status==='healthy')return;}
   catch{if(!retryInspectionErrors)throw Error('Health inspection failed.');}
   if(n<39)await delay();
  }
  throw Error('Exact-image health verification did not pass.');
 }
 assert([r.oldImage,r.newImage].includes(initialImage));
 r.status='applying';delete r.failurePhase;delete r.rollback;delete r.receiptWriteFailed;delete r.checkedAt;
 await ops.save(); // No mutation if the initial receipt cannot be persisted.
 let phase='start';
 try{
  if(initialImage===r.oldImage)await ops.start(r);
  phase='healthcheck';await healthy(r.newImage);
  phase='receipt';r.status='passed';r.checkedAt=new Date().toISOString();await ops.save();
 }catch{
  r.status='failed';r.failurePhase=phase;r.checkedAt=new Date().toISOString();
  r.rollback={status:'attempting',checkedAt:null};
  try{
   // A mutable tag must still identify the reviewed old image before rollback.
   assert.equal((await ops.inspect(rollbackRef)).Id,rollbackImage);
   try{await ops.rollback(r);}catch{r.rollback.commandFailed=true;}
   // A failed compose command can still have started the old container. Verify it.
   await healthy(rollbackImage,true);
   r.rollback.status='verified';
  }catch{r.rollback.status='unverified';}
  r.rollback.checkedAt=new Date().toISOString();
  try{await ops.save();}catch{r.receiptWriteFailed=true;}
  const outcome=r.rollback.status==='verified'
   ?(r.rollbackRef?'exact reviewed fallback image is running and healthy; reconcile source pin':'exact old same-engine image is running and healthy; reconcile source pin')
   :'rollback NOT verified; inspect this database service before further release work';
  throw Error(r.name+': release failed during '+phase+'; '+outcome+'. No data restore attempted.'+(r.receiptWriteFailed?' Receipt write also failed.':''));
 }
}

async function main(){
process.umask(0o077);
const stage=JSON.parse(await readFile(dir+'/stage.json','utf8'));assert.equal(stage.status,'passed');assert.equal(stage.backups.length,11);assert(Date.now()-Date.parse(stage.completedAt)<86400000);
if(process.argv[2]==='prepare'){
 for(const r of stage.backups){const live=await inspect(r.name);assert.equal(live.Image,r.oldImage);const s=await config(r);assert.equal(s.image,r.oldRef);r.configHash=hash(s);assert(r.databases.every(x=>x.restored));}
 await writeFile(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',rows:stage.backups},null,2)+'\n',{mode:0o600});console.log('11 native database services prepared; no production change.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(await readFile(path,'utf8'));assert.equal(report.rows.length,11);
 const save=()=>writeFile(path,JSON.stringify(report,null,2)+'\n',{mode:0o600});
 report.status='applying';delete report.completedAt;await save();
 try{
 for(const r of report.rows){
  const s=await config(r);assert.equal(s.image,r.newRef);assert.equal(hash(s),r.configHash,'Only the image may change');assert.equal((await inspect(r.newRef)).Id,r.newImage);
  const x=await inspect(r.name);
  await releaseReviewedRow(r,x.Image,{inspect,save,
   start:()=>docker([...compose(r),'up','-d','--no-deps','--no-build','--pull','never',r.service]),
   rollback:async()=>{const rollback=dir+'/rollback-'+r.name+'.json';await writeFile(rollback,JSON.stringify({services:{[r.service]:{image:r.rollbackRef||r.oldRef}}}),{mode:0o600});await docker([...compose(r),'-f',rollback,'up','-d','--no-deps','--no-build','--pull','never',r.service]);}
  });
  console.log('Healthy on reviewed same-engine image: '+r.name);
 }
 report.status='passed';report.completedAt=new Date().toISOString();await save();
 }catch(error){report.status='failed';delete report.completedAt;try{await save();}catch{/* Preserve the sanitized release/rollback error. */}throw error;}
}else throw Error('Use prepare, review/edit only exact image pins, then apply.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

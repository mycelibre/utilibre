// Reviewed supported sandbox + dependency layer. One service, no data restore.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/sandbox-final-20261011';
const file='/home/ubuntu/freetools/deployment/records/compose.yaml';
const oldRef='utilibre-grist:libraries-security-20261011';
const newRef='utilibre-grist:1.7.21-language-security-20261011';
const newImage='sha256:aff22494de8e208a15198b124a7772fd07e9a38e009e0043c664927ab788f4b0';
const cache='/grist/sandbox/pyodide/_build/cache:rw,nosuid,nodev,size=128m,uid=1000,gid=1000';
const env={GRIST_SANDBOX_FLAVOR:'pyodide',GRIST_PYODIDE_SKIP_DENO:'0',GRIST_SANDBOX:'/usr/local/bin/grist-deno'};
const command=(c,a)=>{try{return execFileSync(c,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/release-error.log',String(e.stderr||e.message));throw Error('Native release failed; restricted diagnostic retained.');}};
const docker=(...a)=>command('docker',a);
const compose=['compose','-f',file];
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=()=>JSON.parse(docker(...compose,'config','--format','json')).services.grist;
const canonical=c=>Array.isArray(c)?c.map(canonical):c&&typeof c==='object'?Object.fromEntries(Object.keys(c).sort().map(k=>[k,canonical(c[k])])):c;
const hash=c=>createHash('sha256').update(JSON.stringify(canonical(c))).digest('hex');
const path=dir+'/release.json';
if(process.argv[2]==='prepare'){
 const backup=process.argv[3];assert.match(backup,/^\/opt\/utilibre\/records\/backups\/\d{8}T\d{6}Z$/);
 command('python3',['deployment/maintenance/sandbox-final/check-backup.py',backup]);
 const stage=JSON.parse(fs.readFileSync(dir+'/native-KFXaGe/result.json'));assert.equal(stage.passed,true);assert.equal(stage.imageId,newImage);assert(Date.now()-Date.parse(stage.date)<86400000);
 command('node',['deployment/maintenance/sandbox-final/check-grist-live.mjs','--preflight']);
 const before=config();assert.equal(before.image,oldRef);const x=inspect('utilibre-records-grist-1');assert.equal(x.Image,inspect(oldRef).Id);assert.equal(x.State.Health.Status,'healthy');assert.equal(inspect(newRef).Id,newImage);
 const after=structuredClone(before);after.image=newRef;Object.assign(after.environment,env);assert(!after.tmpfs.includes(cache));after.tmpfs.push(cache);
 fs.writeFileSync(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',backup,backupIntegrity:true,beforeConfigHash:hash(before),newConfigHash:hash(after),row:{name:'utilibre-records-grist-1',oldRef,oldImage:x.Image,newRef,newImage}},null,2)+'\n');
 // Private backup of source only; rollback replaces only the reviewed Grist stanza.
 fs.writeFileSync(dir+'/previous-compose.yaml',fs.readFileSync(file));
 console.log('Grist backup, synthetic sessions and exact candidate verified; no deployment yet.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(fs.readFileSync(path)),r=report.row;assert.equal(report.status,'prepared');assert(Date.now()-Date.parse(report.date)<3600000);assert.equal(hash(config()),report.newConfigHash);assert.equal(inspect(newRef).Id,newImage);
 const save=()=>fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async name=>{
  const x=inspect(name);
  if(name===r.name&&x.Image===newImage&&x.State.Health?.Status==='healthy'){
   for(const [key,value] of Object.entries(env))assert(x.Config.Env.includes(key+'='+value));
   assert.equal(docker('exec',r.name,'sh','-c','test ! -e /usr/bin/runsc && /grist/sandbox/pyodide/worker/node_modules/@deno/linux-x64-glibc/deno --version').split('\n')[0],'deno 2.9.7 (stable, release, x86_64-unknown-linux-gnu)');
   command('node',['deployment/maintenance/sandbox-final/check-grist-live.mjs']);
  }return x;
 },start:()=>docker(...compose,'up','-d','--no-deps','--no-build','--pull','never','grist'),rollback:()=>{
  const original=fs.readFileSync(dir+'/previous-compose.yaml','utf8'),current=fs.readFileSync(file,'utf8');
  const stanza=/^  grist:\n[\s\S]*?(?=^  grist-auth:)/m;assert(stanza.test(original)&&stanza.test(current));
  fs.writeFileSync(file,current.replace(stanza,original.match(stanza)[0]));assert.equal(hash(config()),report.beforeConfigHash);
  docker(...compose,'up','-d','--no-deps','--no-build','--pull','never','grist');
 }});
 report.status='passed';report.completedAt=new Date().toISOString();report.nativePublicPrivateTask=true;save();console.log('Grist deployed: supported Deno/Pyodide sandbox, native private formula/export and account boundaries passed.');
}else throw Error('Use prepare BACKUP, apply exact reviewed stanza, then apply.');

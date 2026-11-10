// One explicitly authorized service; reuse the existing scoped rollout/rollback.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {replaceImagePins,namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../../language-final/release.mjs';
import {canonical} from '../../go-final/release.mjs';
import {acquireReleaseLock} from '../../security-20261103/release-lock.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise',file=root+'/release.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(here+'inputs.json'),mode=process.argv[2];assert(['prepare','apply','verify'].includes(mode)&&process.argv.length===3);
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Bounded operation failed; configuration/credentials withheld.');}};
const docker=(...args)=>run('docker',args),inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const configHash=g=>{const c=config(g);for(const row of Object.values(c))delete row.image;return createHash('sha256').update(JSON.stringify(canonical(c))).digest('hex');};
const state=mode=>JSON.parse(run('python3',[here+'state.py',mode]));
function evidence(){
 const b=read(root+'/build.json'),n=read(root+'/application.json'),s=read(root+'/scan-gate.json'),repeat=read(root+'/repeat.json');
 assert(b.passed&&b.configurationUnchanged&&b.base===spec.base&&repeat.passed&&repeat.imageId===b.imageId);
 assert(n.passed&&n.imageId===b.imageId&&s.passed&&s.imageId===b.imageId&&s.newHighCritical===0&&s.removedMarkdownFinding);
 assert.equal(n.fixtureSha256,sha(here+'native.cjs'));assert.equal(n.runnerSha256,sha(here+'check.mjs'));
 for(const [name,hash] of Object.entries(b.recipeHashes))assert.equal(sha(here+name),hash);
 for(const r of [n,s])assert(Date.now()-Date.parse(r.date)<86400000,'Test evidence expired');
 assert.equal(inspect(spec.baseTag).Id,spec.base);assert.equal(inspect(spec.candidate).Id,b.imageId);
 return {build:b,hashes:Object.fromEntries(['build.json','application.json','scan-gate.json','repeat.json'].map(p=>[p,sha(root+'/'+p)]))};
}
async function route(){const r=await fetch('https://status.utilibre.org/status/utilibre',{redirect:'manual',signal:AbortSignal.timeout(10000)});await r.body?.cancel();assert.equal(r.status,200);return r.status;}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 if(mode==='prepare'){
  assert(!fs.existsSync(file));const e=evidence(),x=inspect(spec.container),l=x.Config.Labels;
  assert.equal(x.Image,spec.base);assert(x.State.Running);
  const g={key:'kuma-without-apprise',project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),status:'prepared',before:[],rows:[{name:spec.container,service:'uptime-kuma',oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:spec.baseTag,oldImage:spec.base,newRef:spec.candidate,newImage:e.build.imageId}]};
  assert.equal(g.project,'utilibre-community');assert.equal(g.cwd,'/home/ubuntu/freetools/deployment/community');assert.deepEqual(g.files,[g.cwd+'/compose.yaml']);
  const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));assert.deepEqual(namespaceDependents(all,new Set([spec.container])),[]);
  assert.equal(config(g)['uptime-kuma'].image,spec.baseTag);g.configHash=configHash(g);
  await checkExistingGroup(g,'old');await route();state('before');
  fs.copyFileSync(g.files[0],root+'/compose.before.yaml');
  for(const p of ['security.json','security-queue.json','security-decisions.json'])fs.copyFileSync('/var/lib/utilibre-maintenance/'+p,root+'/'+p+'.before');
  fs.writeFileSync(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),groups:[g],evidence:e.hashes,others:all.filter(c=>c.Name!=='/'+spec.container).map(c=>({name:c.Name,id:c.Id}))},null,2)+'\n');
  console.log('Exact one-service release prepared; native SQLite recovery snapshot retained.');
 }else{
  const report=read(file),g=report.groups[0];assert.equal(report.groups.length,1);const row=g.rows[0];
  const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
  const validate=()=>{assert.deepEqual(evidence().hashes,report.evidence);assert.equal(configHash(g),g.configHash);};
  const gate=async version=>{await checkExistingGroup(g,version);await route();state('after');for(const other of report.others)assert.equal(inspect(other.name).Id,other.id,'Unrelated container changed');};
  validate();
  if(report.status==='passed'){await gate('new');console.log('Already-correct release verified; no recreation.');}
  else{
   assert.equal(mode,'apply');assert.equal(report.status,'prepared');assert(Date.now()-Date.parse(report.date)<86400000);
   let rollback=false;
   const pin=(from,to)=>{const f=g.files[0],r=replaceImagePins(fs.readFileSync(f,'utf8'),[{from,to}]);assert.equal(r.replaced,1);fs.writeFileSync(f,r.text);};
   await releaseGroup(g,{
    preflight:()=>{validate();assert.equal(inspect(row.name).Image,row.oldImage);assert.equal(config(g)[row.service].image,row.oldRef);assert.deepEqual(state('inspect'),read(root+'/state-before.json'));const s=fs.statfsSync('/');assert(s.bavail*s.bsize>8*1024**3);},
    save,
    recreate:()=>{validate();if(!rollback)pin(row.oldRef,row.newRef);recreateExistingGroup(g);},
    gate,
    rollbackPins:()=>{rollback=true;if(config(g)[row.service].image===row.newRef)pin(row.newRef,row.oldRef);}
   });
   report.status='passed';report.completedAt=new Date().toISOString();g.completedAt=report.completedAt;save();
   console.log('Kuma deployed; exact image, healthy status, preserved saved state and unchanged other containers verified.');
  }
 }
}finally{unlock();}

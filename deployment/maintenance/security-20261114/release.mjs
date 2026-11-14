// Finite image-only release, reusing the established scoped Compose transaction.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {existingComposeArgs,replaceImagePins,namespaceDependents,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root='/var/lib/utilibre-maintenance/security-20261114';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
const inputs=read(new URL('./inputs.json',import.meta.url)),[mode,key]=process.argv.slice(2);
assert.equal(process.argv.length,4);assert(['check','apply','verify'].includes(mode));
// Expand this explicit policy only after reviewing each application's tests.
assert(['services-freshrss','reader-evaluation-fourget'].includes(key));
const spec=inputs.rows.find(r=>r.key===key),dir=root+'/'+(spec.kind==='debian'?'vendor-debian/':'')+key;
const build=read(dir+'/build.json'),application=read(dir+'/application.json'),scan=read(dir+'/scan-gate.json');
for(const p of [build,application,scan]){assert(p.passed);assert.equal(p.imageId,build.imageId);}
assert.equal(build.base,spec.base);assert.equal(build.candidate,spec.candidate);
assert(build.configurationUnchanged&&build.unrelatedPackagesUnchanged);
assert(scan.targetedBefore>0&&scan.targetedAfter===0&&scan.newHighCritical.length===0);
assert.equal(scan.databaseSha256,inputs.databaseSha256);assert.equal(sha(dir+'/after-scan.json'),scan.rawScanSha256);
const age=Date.now()-Date.parse(scan.advisoryUpdatedAt);assert(age>=0&&age<48*3600000,'Advisory snapshot expired');
assert(Date.now()-Date.parse(application.date)<24*3600000,'Application evidence expired');
for(const [f,h] of Object.entries(inputs.fixtureHashes))assert.equal(sha(repo+'deployment/maintenance/'+f),h,'Retained checker drift');
if(spec.kind==='alpine'){
 const scope=read(dir+'/scope.json');assert(scope.passed&&scope.allUnrelatedImageFilesUnchanged&&scope.unrelatedApkRecordsUnchanged&&scope.muslUnchanged);
 assert.equal(scope.imageId,build.imageId);assert.equal(sha(dir+'/scope.json'),build.scopeSha256);
}
const command=(cmd,args)=>{try{return cp.execFileSync(cmd,args,{cwd:repo,encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/release-error.log',String(e.stderr||e.message));throw Error('Bounded operation failed; private release diagnostic retained');}};
const docker=(...a)=>command('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const shape=c=>{c=structuredClone(c);for(const s of Object.values(c.services))delete s.image;return c;};
assert.equal(inspect(spec.candidate).Id,build.imageId);
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 const recordFile=dir+'/release.json',name=spec.containers[0];assert.equal(spec.containers.length,1);
 if(fs.existsSync(recordFile)){
  const previous=read(recordFile);assert.equal(previous.status,'passed');assert.equal(inspect(name).Image,build.imageId);
  await checkExistingGroup(previous.group,'new');console.log(key+': already deployed and healthy; no restart');
 }else{
  assert.notEqual(mode,'verify');const x=inspect(name),l=x.Config.Labels;assert.equal(x.Image,spec.base);
  const g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:[],status:'prepared'};
  const original=config(g),service=l['com.docker.compose.service'],oldRef=original.services[service].image;
  assert.equal(inspect(oldRef).Id,spec.base);
  g.rows.push({name,service,oldImage:spec.base,newImage:build.imageId,oldRef,newRef:spec.candidate,oldContainerId:x.Id,oldRestartCount:x.RestartCount});
  const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
  assert.deepEqual(namespaceDependents(all,new Set([name])),[],'Unreviewed namespace companion');
  const mirrors=key==='services-freshrss'?[repo+'deployment/utilibre/compose.yaml']:[];
  const files=[...new Set([...g.files,...mirrors])],changes=[];
  for(const f of files){const before=fs.readFileSync(f,'utf8'),change=replaceImagePins(before,[{from:oldRef,to:spec.candidate}]);if(change.replaced){assert.equal(change.replaced,1);changes.push({file:f,before,after:change.text});}}
  assert.equal(changes.length,key==='services-freshrss'?2:1);
  const binding=key==='services-freshrss'?x.HostConfig.PortBindings['80/tcp'][0]:null;
  const url=binding?'http://'+binding.HostIp+':'+binding.HostPort+'/i/?c=auth&a=login':'https://4get.utilibre.org/';
  const route=async()=>{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)}),text=await r.text();assert.equal(r.status,200);assert(key==='services-freshrss'?text.includes('password')&&text.includes('FreshRSS'):text.includes('<form')&&text.toLowerCase().includes('4get'));if(key==='services-freshrss'){assert.equal(r.headers.get('referrer-policy'),'no-referrer');assert.match(r.headers.get('content-security-policy')||'',/img-src 'self' data: blob:/);}return r.status;};
  await checkExistingGroup(g,'old');await route();
  if(mode==='check'){console.log(key+': isolated build, application, scan, live predecessor and exact configuration preconditions passed; no activation');}
  else{
   const free=fs.statfsSync('/');assert(free.bavail*free.bsize>=inputs.minimumFreeBytes);
   const evidence={date:new Date().toISOString(),status:'prepared',group:g,buildSha256:sha(dir+'/build.json'),applicationSha256:sha(dir+'/application.json'),scanSha256:sha(dir+'/scan-gate.json'),configurationUnchanged:true,retentionUnchanged:true,productionDataModifiedByTests:false};
   fs.writeFileSync(dir+'/rollback-files.json',JSON.stringify(changes.map(({file,before})=>({file,before})),null,2));
   const save=()=>{evidence.status=g.status;fs.writeFileSync(recordFile,JSON.stringify(evidence,null,2)+'\n');};
   let reverting=false;
   await releaseGroup(g,{
    preflight:()=>{assert.equal(inspect(name).Id,x.Id);for(const c of changes)assert.equal(fs.readFileSync(c.file,'utf8'),c.before);},save,
    recreate:async()=>{if(!reverting)for(const c of changes)fs.writeFileSync(c.file,c.after);assert.deepEqual(shape(config(g)),shape(original));assert.equal(config(g).services[service].image,reverting?oldRef:spec.candidate);await recreateExistingGroup(g);},
    gate:async version=>{await checkExistingGroup(g,version);await route();assert.deepEqual(inspect(name).Mounts,x.Mounts);for(const c of all)if(c.Name!==x.Name)assert.equal(inspect(c.Name).Id,c.Id,'Unrelated container changed');},
    rollbackPins:()=>{reverting=true;for(const c of changes)fs.writeFileSync(c.file,c.before);}
   });
   evidence.completedAt=new Date().toISOString();save();console.log(key+': exact candidate deployed; health, route, mounts, privacy configuration and unrelated containers verified');
  }
 }
}finally{unlock();}

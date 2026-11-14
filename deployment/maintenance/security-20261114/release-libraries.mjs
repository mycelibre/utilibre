// Exact package-only activation using retained Compose, rollback and relay gates.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {boundRelaySockets} from '../security-20261109/relay-idle.mjs';
import {existingComposeArgs,existingGroupStatus,replaceImagePins,namespaceDependents,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const repo=fileURLToPath(new URL('../../../',import.meta.url)),root='/var/lib/utilibre-maintenance/security-20261114';
const read=p=>JSON.parse(fs.readFileSync(p)),hash=b=>createHash('sha256').update(b).digest('hex'),sha=p=>hash(fs.readFileSync(p));
const pythonMode=process.argv[2]==='--python',headerMode=process.argv[2]==='--headers',gitMode=process.argv[2]==='--git';if(pythonMode||headerMode||gitMode)process.argv.splice(2,1);
const inputs=read(new URL('./inputs.json',import.meta.url)),selection=pythonMode||headerMode||gitMode?read(new URL(pythonMode?'./python-inputs.json':gitMode?'./git-inputs.json':'./headers-inputs.json',import.meta.url)):inputs,[mode,key]=process.argv.slice(2);
assert.equal(process.argv.length,4);assert(['check','apply','verify'].includes(mode));
assert((pythonMode||headerMode||gitMode?selection.rows.map(r=>r.key):['linkding-linkding','turn-option-turn','identity-worker','kitchenowl-app','pack-forms-app','services-privatebin','pollaris-pollaris','community-pairdrop']).includes(key));
const spec=selection.rows.find(r=>r.key===key),dir=root+'/'+(gitMode?'git/':headerMode?'headers/vendor-debian/':pythonMode?'python/':spec.kind==='debian'?'vendor-debian/':'')+key;
const build=read(dir+'/build.json'),app=read(dir+'/application.json'),scan=read(dir+'/scan-gate.json');
for(const p of [build,app,scan]){assert(p.passed);assert.equal(p.imageId,build.imageId);}
assert.equal(build.base,spec.base);assert.equal(build.candidate,spec.candidate);assert(build.configurationUnchanged&&build.unrelatedPackagesUnchanged);
assert(scan.targetedBefore>0&&scan.newHighCritical.length===0);if(gitMode){assert(scan.exactGitMaintenanceRelease&&scan.rawBackportFindingsRetained);assert.equal(selection.packages[spec.packages.git.package].version,'1:2.54.1+utilibre1');}else assert.equal(scan.targetedAfter,0);
assert.equal(scan.databaseSha256,inputs.databaseSha256);assert.equal(sha(dir+'/after-scan.json'),scan.rawScanSha256);
const age=Date.now()-Date.parse(scan.advisoryUpdatedAt);assert(age>=0&&age<48*3600000);assert(Date.now()-Date.parse(app.date)<24*3600000);
if('libpq' in spec.packages||'libpq5' in spec.packages){const consumer=read(dir+'/consumer.json');assert(consumer.passed&&consumer.abiPreserved);assert.equal(consumer.imageId,build.imageId);assert.deepEqual(consumer.nativeRows.map(r=>r.imageId),[spec.base,build.imageId]);assert(consumer.nativeRows.every(r=>r.passed&&r.checks===6));}
if(spec.kind==='alpine'){const scope=read(dir+'/scope.json');assert(scope.passed&&scope.allUnrelatedImageFilesUnchanged&&scope.unrelatedApkRecordsUnchanged&&scope.muslUnchanged);assert.equal(sha(dir+'/scope.json'),build.scopeSha256);}
if(headerMode){const scope=read(dir+'/scope.json');assert(scope.passed&&scope.allRuntimeFilesUnchanged&&scope.vendorInstalledPayloadMatches&&scope.noElfPayload);assert.equal(sha(dir+'/scope.json'),build.scopeSha256);assert(build.fullImageScopeVerified&&app.headerCompilation&&app.allRuntimeFilesUnchanged);}
if(gitMode){const scope=read(dir+'/scope.json');assert(scope.passed&&scope.allUnrelatedFilesUnchanged);assert.equal(sha(dir+'/scope.json'),build.scopeSha256);assert(build.nativeRows.every(r=>r.passed)&&app.nativeGitWorkflows);}
if(pythonMode){const scope=read(dir+'/scope.json');assert(scope.passed&&scope.allUnrelatedFilesUnchanged&&scope.configurationUnchanged);assert.equal(sha(dir+'/scope.json'),build.scopeSha256);}
const command=(cmd,args)=>{try{return cp.execFileSync(cmd,args,{cwd:repo,encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/release-error.log',String(e.stderr||e.message));throw Error('Bounded release operation failed; private diagnostic retained');}};
const docker=(...a)=>command('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const shape=c=>{c=structuredClone(c);for(const s of Object.values(c.services))delete s.image;for(const [k,v] of Object.entries(c))if(k.startsWith('x-')&&v&&typeof v==='object')delete v.image;return c;};
assert.equal(inspect(spec.candidate).Id,build.imageId);
function idle(x){
 if(key!=='turn-option-turn')return;
 const m=x.Mounts.find(m=>m.Destination==='/run/config/turnserver.conf');assert(m&&!m.RW);
 const text=fs.readFileSync(m.Source,'utf8'),get=n=>Number(text.match(new RegExp('^'+n+'=(\\d+)$','m'))?.[1]);
 const tables=['udp','udp6','tcp','tcp6'].map(t=>docker('exec',x.Name,'cat','/proc/net/'+t));
 assert.equal(boundRelaySockets(tables,get('min-port'),get('max-port')),0,'Active relay allocations: postpone this relay, do not interrupt transfers');
}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 const projects=new Map();for(const n of spec.containers){const x=inspect(n),p=x.Config.Labels['com.docker.compose.project'];if(!projects.has(p))projects.set(p,[]);projects.get(p).push(x);}
 for(const [project,live] of projects){
  const recordFile=dir+'/release-'+project+'.json';
  if(fs.existsSync(recordFile)){
   const previous=read(recordFile);assert.equal(previous.status,'passed');await checkExistingGroup(previous.group,'new');
   console.log(key+'/'+project+': already deployed; no restart');continue;
  }
  assert.notEqual(mode,'verify');for(const x of live)assert.equal(x.Image,spec.base);
  const l=live[0].Config.Labels,g={project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:[],status:'prepared'};
  const original=config(g),refs=new Set();
  for(const x of live){const service=x.Config.Labels['com.docker.compose.service'],oldRef=original.services[service].image;assert.equal(inspect(oldRef).Id,spec.base);refs.add(oldRef);g.rows.push({name:x.Name.slice(1),service,oldRef,newRef:spec.candidate,oldImage:spec.base,newImage:build.imageId,oldContainerId:x.Id,oldRestartCount:x.RestartCount});}
  const all=JSON.parse(docker('inspect',...docker('ps','-q','--filter','label=com.docker.compose.project').split('\n')));
  // These existing supervisors recreate their complete three-role project to
  // reinstall its egress boundaries. Include unchanged companions explicitly.
  if(pythonMode&&['utilibre-trip','utilibre-13ft','utilibre-unfurl'].includes(project)){
   for(const x of all.filter(x=>x.Config.Labels['com.docker.compose.project']===project&&!g.rows.some(r=>r.name===x.Name.slice(1)))){
    const service=x.Config.Labels['com.docker.compose.service'];assert(['proxy','gateway'].includes(service));const ref=original.services[service].image;assert.equal(inspect(ref).Id,x.Image);
    live.push(x);g.rows.push({name:x.Name.slice(1),service,oldRef:ref,newRef:ref,oldImage:x.Image,newImage:x.Image,oldContainerId:x.Id,oldRestartCount:x.RestartCount});
   }
  }
  const selected=new Set(g.rows.map(r=>r.name));
  assert.deepEqual(namespaceDependents(all,selected),[],'Unreviewed namespace companion');
  const mirrors=project==='utilibre-services'?[repo+'deployment/utilibre/compose.yaml']:[];
  const files=[...new Set([...g.files,...mirrors])],changes=[];
  for(const file of files){
   const before=fs.readFileSync(file,'utf8');
   if(pythonMode&&project==='utilibre-simplelogin'){
    let after=before;
    for(const role of ['web','smtp','jobs']){const anchor='  '+role+':\n    <<: *app\n';assert.equal(after.split(anchor).length,2);after=after.replace(anchor,anchor+'    image: '+spec.candidate+'\n');}
    changes.push({file,before,after});continue;
   }
   if(project==='utilibre-turn-option'){
    // Keep the optional lab profile's anchor unchanged; update only live turn.
    const anchor='  turn:\n    <<: *turn\n';assert.equal(before.split(anchor).length,2);
    changes.push({file,before,after:before.replace(anchor,anchor+'    image: '+spec.candidate+'\n')});continue;
   }
   const from=[...refs];if(mirrors.includes(file)&&spec.sourceMirrorPreviousRef)from.push(spec.sourceMirrorPreviousRef);
   const change=replaceImagePins(before,from.map(from=>({from,to:spec.candidate})));if(change.replaced){assert(change.replaced>=1&&change.replaced<=g.rows.length);changes.push({file,before,after:change.text});}
  }
  assert.equal(changes.length,project==='utilibre-services'?2:1);
  // Resolve a candidate file before touching active configuration. Compose
  // retains x-* anchors in JSON as well as their resolved service values.
  const previews=new Map();
  for(const [index,c] of changes.entries())if(g.files.includes(c.file)){const file=dir+'/candidate-'+project+'-'+index+'.yaml';fs.writeFileSync(file,c.after);previews.set(c.file,file);}
  const preview=config({...g,files:g.files.map(f=>previews.get(f)||f)});assert.deepEqual(shape(preview),shape(original));
  for(const [name,s] of Object.entries(preview.services))assert.equal(s.image,g.rows.find(r=>r.service===name)?.newRef||original.services[name].image,'Unselected service image changed');
  g.before=await existingGroupStatus(g);assert(g.before.every(s=>s>=200&&s<400));await checkExistingGroup(g,'old');
  for(const x of live)idle(x);
  if(mode==='check'){console.log(key+'/'+project+': native workflows, scans and exact release preconditions passed; no activation');continue;}
  const free=fs.statfsSync('/');assert(free.bavail*free.bsize>=inputs.minimumFreeBytes);
  const evidence={date:new Date().toISOString(),status:'prepared',group:g,buildSha256:sha(dir+'/build.json'),applicationSha256:sha(dir+'/application.json'),scanSha256:sha(dir+'/scan-gate.json'),configurationUnchanged:true,retentionUnchanged:true,productionDataModifiedByTests:false};
  fs.writeFileSync(dir+'/rollback-'+project+'.json',JSON.stringify(changes.map(({file,before})=>({file,before})),null,2));
  const save=()=>{evidence.status=g.status;fs.writeFileSync(recordFile,JSON.stringify(evidence,null,2)+'\n');};let reverting=false;
  function exactConfig(version){const c=config(g);assert.deepEqual(shape(c),shape(original));for(const [n,s] of Object.entries(c.services)){const row=g.rows.find(r=>r.service===n);assert.equal(s.image,row?row[version+'Ref']:original.services[n].image);}}
  await releaseGroup(g,{
   preflight:()=>{for(const x of live){assert.equal(inspect(x.Name).Id,x.Id);idle(x);}for(const c of changes)assert.equal(fs.readFileSync(c.file,'utf8'),c.before);},save,
   recreate:async()=>{if(!reverting)for(const c of changes)fs.writeFileSync(c.file,c.after);exactConfig(reverting?'old':'new');await recreateExistingGroup(g);},
   gate:async version=>{await checkExistingGroup(g,version);exactConfig(version);for(const x of live)assert.deepEqual(inspect(x.Name).Mounts,x.Mounts);for(const c of all)if(!selected.has(c.Name.slice(1)))assert.equal(inspect(c.Name).Id,c.Id,'Unrelated container changed');},
   rollbackPins:()=>{reverting=true;for(const c of changes)fs.writeFileSync(c.file,c.before);}
  });
  evidence.completedAt=new Date().toISOString();save();console.log(key+'/'+project+': exact package candidate deployed; native health, configuration, mounts and unrelated containers verified');
 }
}finally{unlock();}

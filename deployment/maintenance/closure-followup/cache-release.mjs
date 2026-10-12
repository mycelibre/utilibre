// Finite cache or terminal-CLI rollout. No migrations or user-data operations.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,releaseGroup,rollbackFiles,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
process.umask(0o077);
const [mode,variant]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));assert([undefined,'--ncurses','--rsync','--util-linux','--curl'].includes(variant));assert(process.argv.length<=4);
const kind=variant==='--ncurses'?'ncurses':variant==='--rsync'?'rsync':variant==='--util-linux'?'util-linux':variant==='--curl'?'curl':'cache';
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',file=dir+'/'+kind+'-release.json';
const read=p=>JSON.parse(fs.readFileSync(p)),digest=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Docker operation failed; sensitive configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=s=>{const {image,...rest}=s;return digest(rest);};
const save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
if(mode==='prepare'){
 assert(!fs.existsSync(file),'Never overwrite a release receipt');
 const specs=JSON.parse(fs.readFileSync(new URL('./'+kind+'-specs.json',import.meta.url))),groups=new Map();
 for(const s of specs){
  const b=read(dir+'/'+kind+'/'+s.key+'/build.json'),n=read(dir+'/'+kind+'/'+s.key+'/native.json');
  assert(b.passed&&b.configurationUnchanged&&n.passed);assert.equal(n.imageId,b.imageId);assert.equal(inspect(s.candidate).Id,b.imageId);assert(Date.now()-Date.parse(n.date)<86400000);
  if(kind==='ncurses'){assert(n.nativeTerminalRoundTrip&&n.longSgrInput&&n.sharedLibrariesUnchanged);assert.match(b.applicationSha256,/^[a-f0-9]{64}/);assert.match(b.librariesSha256,/^[a-f0-9]{64}/);}
  if(kind==='curl'){
   assert.equal(b.version,'8.22.0-1~deb13u1+utilibre1');assert(n.abiPreserved);
   assert(n.nativeTransfers.length>=2&&n.nativeTransfers.every(t=>t.passed&&t.checks===7&&[s.base,b.imageId].includes(t.image)));
   assert(n.upstreamSuites.length===2&&n.upstreamSuites.every(t=>t.passed===t.reported&&t.passed>1000));
   for(const key of ['applicationSha256','etcSha256','unrelatedLibrariesSha256'])assert.match(b[key],/^[a-f0-9]{64}/);
   assert(b.abi.length&&b.abi.every(a=>a.preservedSymbols>0));
   if(s.key==='curl-services-freshrss')assert(n.phpCurlTls);
  }
  if(kind==='util-linux'){
   assert(n.nativeMountFailureAndSuccess&&n.simulatedCgroupDescriptorClosed&&n.nativeFstabAndLock&&n.abiPreserved);
   assert.equal(n.reported,337);assert.equal(b.version,'2.41.5-0+deb13u1+utilibre2');
   for(const key of ['applicationSha256','etcSha256','unrelatedLibrariesSha256'])assert.match(b[key],/^[a-f0-9]{64}/);
   assert([5,7].includes(b.abi.length));assert(b.abi.every(a=>a.preservedSymbols>0));
   if(b.abi.length===7)assert.deepEqual(b.abi.slice(5).map(a=>a.path),['/opt/imagick/lib/deps/libmount.so.1','/opt/imagick/lib/deps/libblkid.so.1']);
  }
  if(kind==='rsync'){
   assert(n.nativeLocalIncrementalAndSafeLinks&&n.nativeLoopbackDaemonReadOnly);assert.equal(n.upstreamPassed,306);
   const db=read(dir+'/rsync/'+s.key+'/database.json');assert(db.passed&&db.nativeDumpRestore&&db.documentdbTypedDataAndRoleIsolation);assert.equal(db.imageId,b.imageId);
   assert.match(b.applicationSha256,/^[a-f0-9]{64}/);assert.match(b.librariesSha256,/^[a-f0-9]{64}/);
  }
  if(['cache-community-uptime-kuma','cache-services-rsshub'].includes(s.key)){const a=read(dir+'/cache/'+s.key+'/application.json');assert(a.passed&&a.imageId===b.imageId);}
  if(s.key==='cache-expanded-actual'){
   const proof=fs.readdirSync('/opt/utilibre/reports').filter(x=>x.startsWith('actual-leaves-native-')).flatMap(x=>{try{return [read('/opt/utilibre/reports/'+x+'/result.json')]}catch{return []}}).find(x=>x.image===s.candidate&&Date.now()-Date.parse(x.testedAt)<86400000);
   assert(proof?.passed&&proof.nativeZipExportAndImport&&proof.nativeServerSyncAndDownload);assert.deepEqual(proof.externalRequests,[]);
  }
  for(const name of s.containers){
   const x=inspect(name);assert.equal(x.Image,s.base);const l=x.Config.Labels,project=l['com.docker.compose.project'];assert(project);
   let g=groups.get(project);if(!g){g={project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared'};groups.set(project,g);}
   const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(inspect(c.image).Id,s.base);
   g.rows.push({name,key:s.key,service,oldRef:c.image,oldImage:s.base,newRef:s.candidate,newImage:b.imageId,configHash:hash(c),verification:dir+'/'+kind+'/'+s.key+'/native.json'});
  }
 }
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 for(const {container:x,parent} of namespaceDependents(all,new Set(specs.flatMap(s=>s.containers)))){
  const l=x.Config.Labels,g=groups.get(l['com.docker.compose.project']);assert(g,'Unreviewed cross-project companion');
  const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(inspect(c.image).Id,x.Image);
  g.rows.push({name:x.Name.slice(1),key:'namespace-companion',service,oldRef:c.image,newRef:c.image,oldImage:x.Image,newImage:x.Image,configHash:hash(c),namespaceParent:parent});
 }
 if(groups.has('utilibre-services'))groups.get('utilibre-services').mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
 for(const g of groups.values()){g.before=await existingGroupStatus(g);assert(g.before.every(n=>n>=200&&n<500));await checkExistingGroup(g,'old');}
 const report={date:new Date().toISOString(),status:'prepared',groups:[...groups.values()]};save(report);console.log(`Prepared ${report.groups.length} projects; production unchanged.`);
}else{
 const r=read(file);assert(Date.now()-Date.parse(r.date)<86400000,'Expired preparation');
 for(const g of r.groups){
  if(g.status==='passed'){await checkExistingGroup(g,'new');continue;}assert.equal(g.status,'prepared');
  assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Recovery floor');
  const validate=()=>{const c=config(g);for(const row of g.rows){assert.equal(hash(c[row.service]),row.configHash);assert([row.oldRef,row.newRef].includes(c[row.service].image));assert.equal(inspect(row.newRef).Id,row.newImage);assert.equal(inspect(row.oldRef).Id,row.oldImage);}};
  const repin=reverse=>{const pairs=g.rows.filter(x=>x.oldRef!==x.newRef).map(x=>({from:x[reverse?'newRef':'oldRef'],to:x[reverse?'oldRef':'newRef']}));let n=0;for(const f of rollbackFiles(g)){const out=replaceImagePins(fs.readFileSync(f,'utf8'),pairs);if(out.replaced){fs.writeFileSync(f,out.text);n+=out.replaced;}}assert(n);};
  let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();await checkExistingGroup(g,'old');},save:()=>save(r),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>checkExistingGroup(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
  g.completedAt=new Date().toISOString();save(r);console.log(g.project+': exact replacements healthy');
 }
 r.status='passed';r.completedAt=new Date().toISOString();save(r);
}

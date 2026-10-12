// Exact image-only rollout. Reuse the existing per-service rollback mechanism.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {replaceImagePins,namespaceDependents,releaseGroup,readinessSeconds} from '../language-final/release.mjs';
import {canonical} from '../go-final/release.mjs';
process.umask(0o077);
const root='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/runtime-gnutls-minimization-20261012';
const file=dir+'/release.json',read=p=>JSON.parse(fs.readFileSync(p));
const specs=read(new URL('./specs.json',import.meta.url));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; configuration output withheld.');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const compose=g=>['compose','--project-directory',g.cwd,'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const hash=s=>{const {image,...other}=s;return createHash('sha256').update(JSON.stringify(canonical(other))).digest('hex');};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function evidence(s){
 const path=dir+'/images/'+s.key;
 const b=read(path+'/build.json'),n=read(path+'/application.json'),scan=read(path+'/scan.json');
 assert(scan.passed&&scan.gnutlsFindings===0&&scan.linkage.baselineMissingDependenciesUnchanged);assert.equal(scan.imageId,b.imageId);
 assert(b.passed&&b.configurationUnchanged&&b.filesystemParity&&b.packageRemovalExact,'Candidate parity required');
 assert(n.passed,'Native application gate required');assert.equal(n.imageId,b.imageId);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(inspect(s.candidate).Id,b.imageId);
 assert(Date.now()-Date.parse(n.date||n.checkedAt||n.testedAt)<86400000,'Application evidence expired');
 return {build:b,buildHash:sha(path+'/build.json'),applicationHash:sha(path+'/application.json')};
}
async function health(g,version){
 const max=readinessSeconds([inspect(g.name)]);
 for(let i=0;i<max;i++){
  try{const x=inspect(g.name);assert.equal(x.Image,g[version+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);assert.equal(x.State.Health?.Status,'healthy');return;}
  catch{if(i===max-1)throw Error('Native health did not pass');await new Promise(r=>setTimeout(r,1000));}
 }
}
const mode=process.argv[2];assert(['prepare','apply'].includes(mode)&&process.argv.length===3);
if(mode==='prepare'){
 assert(!fs.existsSync(file),'Do not overwrite a prior release receipt');
 const groups=[];
 for(const s of specs){
  const e=evidence(s),x=inspect(s.container),l=x.Config.Labels;assert.equal(x.Image,s.base);assert.equal(x.State.Health?.Status,'healthy');
  const g={key:s.key,name:s.container,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:s.service,oldRef:s.baseTag,oldImage:s.base,newRef:s.candidate,newImage:e.build.imageId,status:'prepared',buildHash:e.buildHash,applicationHash:e.applicationHash};
  assert.deepEqual(g.files,[root+'/'+s.compose]);assert.equal(config(g).image,g.oldRef);g.configHash=hash(config(g));
  const oldConfig={...inspect(g.oldImage).Config},newConfig={...inspect(g.newImage).Config};delete oldConfig.Image;delete newConfig.Image;assert.deepEqual(oldConfig,newConfig,'Runtime image configuration must be identical');groups.push(g);
 }
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 assert.deepEqual(namespaceDependents(all,new Set(groups.map(g=>g.name))),[],'Unreviewed shared-network companion');
 for(const f of new Set(groups.flatMap(g=>g.files)))fs.copyFileSync(f,dir+'/'+f.replaceAll('/','_')+'.before');
 fs.copyFileSync('/var/lib/utilibre-maintenance/security-queue.json',dir+'/queue.before.json');
 fs.copyFileSync('/var/lib/utilibre-maintenance/security-decisions.json',dir+'/decisions.before.json');
 fs.writeFileSync(file,JSON.stringify({date:new Date().toISOString(),status:'prepared',groups},null,2)+'\n');
 console.log('Four exact-image releases prepared; production unchanged.');
}else{
 const report=read(file);assert(['prepared','applying'].includes(report.status));assert.equal(report.groups.length,4);assert(Date.now()-Date.parse(report.date)<86400000);
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 for(const g of report.groups){
  if(g.status==='passed'){await health(g,'new');continue;}
  const space=fs.statfsSync('/');assert(space.bavail*space.bsize>=8*1024**3,'Preserve recovery floor');
  const e=evidence(specs.find(s=>s.key===g.key));assert.equal(e.buildHash,g.buildHash);assert.equal(e.applicationHash,g.applicationHash);
  const validate=()=>{assert.equal(inspect(g.oldRef).Id,g.oldImage);assert.equal(inspect(g.newRef).Id,g.newImage);assert.equal(hash(config(g)),g.configHash);};
  const pin=(from,to)=>{const f=g.files[0],r=replaceImagePins(fs.readFileSync(f,'utf8'),[{from,to}]);assert.equal(r.replaced,1);fs.writeFileSync(f,r.text);};
  let rollback=false,touched=false;
  await releaseGroup(g,{
   preflight:()=>{validate();assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);},save,
   recreate:()=>{validate();if(rollback&&!touched)return;if(!rollback)pin(g.oldRef,g.newRef);assert.equal(config(g).image,rollback?g.oldRef:g.newRef);touched=true;docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},
   gate:v=>health(g,v),rollbackPins:()=>{rollback=true;validate();if(config(g).image===g.newRef)pin(g.newRef,g.oldRef);}
  });
  g.verifiedAt=new Date().toISOString();save();console.log(g.key+': exact image and native health verified');
 }
 report.status='passed';report.completedAt=new Date().toISOString();save();
}

import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,replaceImagePins,rollbackFiles,namespaceDependents,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012',file=root+'/release.json';
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const stage=read(root+'/stage.json'),pkg=read(root+'/package.json');assert.equal(stage.status,'passed');assert.equal(stage.rows.length,5);assert.equal(stage.packageSha256,sha(fs.readFileSync(root+'/package.json')));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded release command failed; raw configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=s=>{const {image,...rest}=s;return sha(JSON.stringify(canonical(rest)));};
const save=r=>{fs.writeFileSync(file+'.tmp',JSON.stringify(r,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const urls={gathio:'http://10.10.1.43:3198/',priviblur:'http://10.10.1.43:3139/',breezewiki:'http://10.10.1.43:3134/',freshrss:'http://10.10.1.43:3106/'};
async function statuses(g){const out=[];for(const r of g.rows){const url=urls[r.key];if(!url)continue;const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(6000)});out.push([r.key,response.status]);await response.body?.cancel();}return out;}
async function gate(g,which){
 await checkExistingGroup(g,which);assert.deepEqual(await statuses(g),g.httpBefore);
 for(const r of g.rows.filter(r=>r.key!=='namespace-companion')){
  const v=docker('exec','--user','65534:65534',r.name,'perl','-MArchive::Tar','-e','print $Archive::Tar::VERSION,"|",$INC{"Archive/Tar.pm"}');
  assert.equal(v,which==='new'?'3.14|/usr/share/perl5/Archive/Tar.pm':r.prior);
  if(which==='new')for(const m of pkg.modules)assert.equal(docker('exec',r.name,'sha256sum',m.path).split(/\s+/)[0],m.sha256);
 }
}
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
if(mode==='prepare'){
 assert(!fs.existsSync(file),'Do not overwrite release history');const groups=new Map();
 for(const s of stage.rows){
  assert(s.nativeSuite&&s.nativeCli&&s.configurationUnchanged&&s.unrelatedPackagesUnchanged);assert.equal(inspect(s.candidate).Id,s.image);
  const x=inspect(s.name);assert.equal(x.Image,s.base);const l=x.Config.Labels,project=l['com.docker.compose.project'];
  let g=groups.get(project);if(!g){g={project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared'};groups.set(project,g);}
  const service=l['com.docker.compose.service'],cfg=config(g);assert.equal(cfg[service].image,s.baseRef);
  g.rows.push({name:s.name,key:s.key,service,oldRef:s.baseRef,newRef:s.candidate,oldImage:s.base,newImage:s.image,prior:s.prior,configHash:hash(cfg[service])});
 }
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 for(const {container:x,parent}of namespaceDependents(all,new Set(stage.rows.map(s=>s.name)))){
  const l=x.Config.Labels,g=groups.get(l['com.docker.compose.project']);assert(g);const service=l['com.docker.compose.service'],cfg=config(g)[service];
  g.rows.push({name:x.Name.slice(1),key:'namespace-companion',service,oldRef:cfg.image,newRef:cfg.image,oldImage:x.Image,newImage:x.Image,configHash:hash(cfg),namespaceParent:parent});
 }
 for(const g of groups.values()){
  if(g.project==='utilibre-services')g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
  g.httpBefore=await statuses(g);assert(g.httpBefore.every(([,status])=>status>=200&&status<400));await gate(g,'old');
 }
 save({date:new Date().toISOString(),status:'prepared',stageSha256:sha(fs.readFileSync(root+'/stage.json')),groups:[...groups.values()]});console.log('Five candidate images prepared; no production changes.');
}else{
 const r=read(file);assert(['prepared','applying'].includes(r.status));assert.equal(r.stageSha256,sha(fs.readFileSync(root+'/stage.json')));assert(Date.now()-Date.parse(r.date)<86400000);
 r.status='applying';save(r);
 for(const g of r.groups){
  if(g.status==='passed'){await gate(g,'new');continue;}
  const validate=()=>{assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);for(const row of g.rows){const c=config(g)[row.service];assert.equal(hash(c),row.configHash);assert([row.oldRef,row.newRef].includes(c.image));assert.equal(inspect(row.oldRef).Id,row.oldImage);assert.equal(inspect(row.newRef).Id,row.newImage);}};
  const repin=reverse=>{const pairs=g.rows.filter(x=>x.oldRef!==x.newRef).map(x=>({from:reverse?x.newRef:x.oldRef,to:reverse?x.oldRef:x.newRef}));let count=0;for(const f of rollbackFiles(g)){const out=replaceImagePins(fs.readFileSync(f,'utf8'),pairs);if(out.replaced){fs.writeFileSync(f,out.text);count+=out.replaced;}}assert(count>=pairs.length);};
  let rollback=false;await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(r),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>gate(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
  g.completedAt=new Date().toISOString();save(r);console.log(g.project+': native module, health and existing entry points passed');
 }
 r.status='passed';r.completedAt=new Date().toISOString();save(r);
}

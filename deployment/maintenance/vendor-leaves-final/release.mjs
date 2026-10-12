// Exact same-application vendor leaf release with native boundaries and rollback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {namespaceDependents,readinessSeconds} from '../language-final/release.mjs';
import {canonical,rollbackImageScalars} from './policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',path=dir+'/release.json';
const command=(exe,args)=>{try{return execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch(e){fs.writeFileSync(dir+'/release-error.json',JSON.stringify({at:new Date().toISOString(),exe,code:e.code,operation:args[0]})+'\n');throw Error('Bounded release operation failed; private sanitized diagnostic retained');}};
const docker=(...args)=>command('docker',args),inspect=n=>JSON.parse(docker('inspect',n))[0];
const hash=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex'),normalized=s=>{const{image,...rest}=s;return hash(rest);};
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-trip'?['--env-file','/opt/utilibre/trip/private/runtime.env']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services;
const coupled=new Set(['utilibre-trip','utilibre-13ft','utilibre-unfurl']);
async function gate(g,which){
 for(let attempt=0;attempt<readinessSeconds(g.rows.map(r=>inspect(r.name)));attempt++){
  try{
   for(const r of g.rows){const x=inspect(r.name);assert.equal(x.Image,r[which+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);
    if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
    if(r.namespaceParent)assert.equal(x.HostConfig.NetworkMode,'container:'+inspect(r.namespaceParent).Id);
    const port=r.kind==='public-egress'?3128:r.kind==='mumble'?64738:r.kind==='penpot-admin'?3000:r.kind==='beaverhabits'?8080:r.kind==='trip'?8000:r.kind==='13ft'?5000:null;
    // Restricted namespaces deliberately deny new self/loopback connections.
    // Observe their listener without bypassing those controls; native request
    // gates use authorized application/gateway paths separately.
    if(port)assert(command('nsenter',['-t',String(x.State.Pid),'-n','ss','-Hlnt','(','sport','=',':'+port,')']).trim());
   }
   if(coupled.has(g.project)){
    command('systemctl',['is-active','--quiet',g.project+'.service']);
    for(const[suffix,chain]of [['proxy','UTILIBRE-PROXY-OUT'],['app','UTILIBRE-APP-OUT']]){
     const x=inspect(g.project+'-'+suffix+'-1');const rules=command('nsenter',['-t',String(x.State.Pid),'-n','iptables','-S',g.project==='utilibre-13ft'?'OUTPUT':chain]);assert(rules.includes(g.project==='utilibre-13ft'?'-P OUTPUT DROP':'-j REJECT'));
    }
   }
   if(g.project==='utilibre-wallabag')command('systemctl',['is-active','--quiet','utilibre-wallabag.service']);
   for(const url of g.project==='utilibre-trip'?['http://127.0.0.1:3224/api/info']:g.project==='utilibre-13ft'?['http://127.0.0.1:3207/']:g.project==='utilibre-unfurl'?['http://10.10.1.43:3209/']:[]){const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(3000)});await response.body?.cancel();assert.equal(response.status,200);}
   return;
  }catch(e){if(attempt===readinessSeconds(g.rows.map(r=>inspect(r.name)))-1)throw e;await new Promise(r=>setTimeout(r,1000));}
 }
}
function recreate(g){
 if(coupled.has(g.project)){command('systemctl',['restart',g.project+'.service']);return;}
 if(g.project==='utilibre-wallabag')command('systemctl',['stop','utilibre-wallabag.service']);
 try{docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',...g.rows.map(r=>r.service));}
 finally{if(g.project==='utilibre-wallabag')command('systemctl',['start','utilibre-wallabag.service']);}
}
if(process.argv[2]==='prepare'){
 const specs=[];
 for(const family of ['pcre','ssl']){const stage=JSON.parse(fs.readFileSync(dir+'/'+family+'-stage.json')),native=JSON.parse(fs.readFileSync(dir+'/'+family+'-native.json'));assert.equal(stage.status,'passed');assert.equal(native.status,'passed');
  for(const r of stage.rows){assert(native.rows.some(n=>n.kind===r.kind&&n.imageId===r.candidateId&&(n.passed||n.status==='passed')));specs.push({...r,family,containers:r.kind==='public-egress'?['utilibre-13ft-proxy-1','utilibre-trip-proxy-1','utilibre-wallabag-proxy-1','utilibre-records-egress-1','utilibre-unfurl-proxy-1']:[r.name]});}}
 const admin=JSON.parse(fs.readFileSync(dir+'/admin-stage.json')),native=JSON.parse(fs.readFileSync(dir+'/admin-native.json'));assert.equal(native.status,'passed');assert.equal(native.imageId,admin.candidateId);specs.push({...admin,kind:'penpot-admin',family:'admin',containers:[admin.name]});
 const groups=new Map();for(const s of specs)for(const name of s.containers){const x=inspect(name),l=x.Config.Labels;assert.equal(x.Image,s.base);assert.equal(inspect(s.candidate).Id,s.candidateId);
  const project=l['com.docker.compose.project'];let g=groups.get(project);if(!g){g={project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared'};groups.set(project,g);}
  const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(inspect(c.image).Id,s.base);g.rows.push({name,kind:s.kind,family:s.family,service,oldRef:c.image,oldImage:s.base,newRef:s.candidate,newImage:s.candidateId,configHash:normalized(c)});
 }
 const containers=JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n'))),selected=new Set([...groups.values()].flatMap(g=>g.rows.map(r=>r.name)));
 for(const{container:x,parent}of namespaceDependents(containers,selected)){const l=x.Config.Labels,g=groups.get(l['com.docker.compose.project']);assert(g);const service=l['com.docker.compose.service'],c=config(g)[service];g.rows.push({name:x.Name.slice(1),kind:'namespace-companion',service,oldRef:c.image,newRef:c.image,oldImage:x.Image,newImage:x.Image,namespaceParent:parent,configHash:normalized(c)});}
 for(const g of groups.values()){console.log('Baseline: '+g.project);await gate(g,'old');if(g.project==='utilibre-services')g.mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];}
 fs.writeFileSync(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',groups:[...groups.values()]},null,2)+'\n');console.log('13 candidate images / 17 roles plus unchanged namespace companions prepared. No source or production mutation.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(fs.readFileSync(path));assert(['prepared','applying'].includes(report.status));assert(Date.now()-Date.parse(report.date)<86400000);
 const save=()=>fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 for(const g of report.groups){if(g.status==='passed'){await gate(g,'new');continue;}const space=fs.statfsSync(dir);assert(space.bavail*space.bsize>=8*1024**3);
  const validate=()=>{const c=config(g);for(const r of g.rows){assert.equal(c[r.service].image,r.newRef);assert.equal(normalized(c[r.service]),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);assert.equal(inspect(r.oldRef).Id,r.oldImage);}};
  validate();g.status='applying';g.runtimeTouched=false;save();
  try{
   if(g.project==='utilibre-mumble'){
    const x=inspect('utilibre-mumble-mumble-1');const active=command('nsenter',['-t',String(x.State.Pid),'-n','ss','-Hnt','state','established','(','sport','=',':64738',')']).trim().split('\n').filter(Boolean).length;
    g.quietCheck={at:new Date().toISOString(),establishedControlConnections:active,limitation:'Instantaneous aggregate, not an attendance history; a new join can still race the restart'};
    if(active){g.status='deferred-active-users';save();console.log('Mumble update deferred: active control connections; other groups continue.');continue;}
   }
   g.runtimeTouched=true;recreate(g);await gate(g,'new');g.status='passed';
  }catch{
   g.status='failed';g.rollback='attempting';
   try{
    validate();const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.newRef,to:r.oldRef}));
    // Exact scalar mechanical rewrite is also used by the supervisors. Other
    // image pins/content are retained; normalized service config must match.
    for(const file of [...new Set([...g.files,...(g.mirrorFiles||[]),...(g.project==='public-utility'?[g.cwd+'/.env']:[])])]){const before=fs.readFileSync(file,'utf8'),text=rollbackImageScalars(before,pairs,g.project);
     if(text!==before)fs.writeFileSync(file,text);}
    const c=config(g);for(const r of g.rows){assert.equal(c[r.service].image,r.oldRef);assert.equal(normalized(c[r.service]),r.configHash);}
    if(g.runtimeTouched)recreate(g);await gate(g,'old');g.rollback='verified';
   }catch{g.rollback='unverified';}
   save();throw Error(g.project+': release failed; exact old-image rollback '+g.rollback+'. No data restore/deletion.');
  }
  g.completedAt=new Date().toISOString();save();console.log(g.project+': exact-image native readiness and boundaries passed');
 }
 report.status=report.groups.every(g=>g.status==='passed')?'passed':'partially-deferred';report.completedAt=new Date().toISOString();save();
}else throw Error('Use prepare, patch only exact image pins, then apply.');

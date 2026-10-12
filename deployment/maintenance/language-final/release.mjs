// Finite installer-only replacement. Preparation never changes production.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,readdir,mkdir,statfs} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/language-final-20261011',file=dir+'/release.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const docker=(...args)=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}});}catch{throw Error('Bounded Docker operation failed; output withheld to protect configuration.');}};
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const coupled=new Set(['utilibre-trip','utilibre-13ft','utilibre-unfurl']);
export function replaceImagePins(text,pairs){
 let replaced=0;
 const out=text.replace(/^(\s*image:\s*)([^\s#]+)(.*)$/gm,(line,prefix,value,suffix)=>{
  const pair=pairs.find(p=>p.from===value);if(!pair)return line;replaced++;return prefix+pair.to+suffix;
 });return {text:out,replaced};
}
export function namespaceDependents(containers,selected){
 const rows=[];const ids=new Map(containers.filter(x=>selected.has(x.Name.slice(1))).map(x=>[x.Id,x.Name.slice(1)]));
 let changed=true;
 while(changed){changed=false;for(const x of containers){const name=x.Name.slice(1),parent=ids.get(x.HostConfig.NetworkMode.replace(/^container:/,''));if(parent&&!ids.has(x.Id)){rows.push({container:x,parent});ids.set(x.Id,name);changed=true;}}}
 return rows;
}
export const rollbackFiles=g=>[...new Set([...g.files,...(g.mirrorFiles||[])])];
export const directlyRecreatedServices=g=>g.rows.filter(r=>!(g.project==='utilibre-newsletters'&&r.service==='smtp')).map(r=>r.service);
export function readinessSeconds(containers){
 return Math.min(180,Math.max(60,...containers.map(x=>Math.ceil(((x.Config.Healthcheck?.StartPeriod||0)+2*(x.Config.Healthcheck?.Interval||0)+(x.Config.Healthcheck?.Timeout||0))/1e9)+10)));
}
function compose(g){return ['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-trip'?['--env-file','/opt/utilibre/trip/private/runtime.env']:g.project==='utilibre-community'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];}
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services;
const normalized=s=>{const {image,...rest}=s;return hash(JSON.stringify(rest));};
const ownProjects={
 'utilibre-pack-forms':['http://10.10.1.43:3176/'],
 'utilibre-biblioreads':['http://10.10.1.43:3151/'],
 'utilibre-newsletters':['http://127.0.0.1:3210/'],
 'utilibre-razzia':['http://10.10.1.43:3199/healthz'],
 'utilibre-trip':['http://127.0.0.1:3224/'],
 'utilibre-13ft':['http://127.0.0.1:3207/'],
 'utilibre-unfurl':['http://10.10.1.43:3209/'],
};
async function status(g){const out=[];for(const url of ownProjects[g.project]||[]){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(5000)});out.push(r.status);await r.body?.cancel();}return out;}
async function gate(g,version){
 const maximum=readinessSeconds(g.rows.map(r=>inspect(r.name)));
 for(let attempt=0;attempt<maximum;attempt++){
  try{
   for(const r of g.rows){const x=inspect(r.name);assert.equal(x.Image,r[version+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>=4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');if(r.namespaceParent)assert.equal(x.HostConfig.NetworkMode,'container:'+inspect(r.namespaceParent).Id,'Stale shared network namespace');}
   assert.deepEqual(await status(g),g.before);
   if(g.project==='utilibre-newsletters'){
    const smtp=inspect('utilibre-newsletters-smtp-1');
    execFileSync('systemctl',['is-active','--quiet','utilibre-newsletters-smtp.service']);
    docker('exec','utilibre-newsletters-smtp-1','node','-e',"const fs=require('fs'),rows=['tcp','tcp6'].flatMap(n=>fs.readFileSync('/proc/net/'+n,'utf8').trim().split('\\n').slice(1).map(r=>r.trim().split(/\\s+/)));require('assert')(rows.some(r=>r[3]==='0A'&&r[1].split(':').at(-1)==='0019'))");
    const rules=execFileSync('nsenter',['-t',String(smtp.State.Pid),'-n','iptables','-S','UTILIBRE-SMTP-IN'],{encoding:'utf8'});assert(rules.includes('10.10.1.20/32 -j ACCEPT')&&rules.includes('-j REJECT'));
   }
   // These project-native supervisors recreate namespace firewall boundaries.
   if(coupled.has(g.project)){
    execFileSync('systemctl',['is-active','--quiet',g.project+'.service']);
    const proxy=inspect(g.project+'-proxy-1'),app=inspect(g.project+'-app-1');
    for(const [x,chain] of [[proxy,'UTILIBRE-PROXY-OUT'],[app,'UTILIBRE-APP-OUT']]){
     const output=execFileSync('nsenter',['-t',String(x.State.Pid),'-n','iptables','-S',g.project==='utilibre-13ft'?'OUTPUT':chain],{encoding:'utf8'});
     assert(output.includes(g.project==='utilibre-13ft'?'-P OUTPUT DROP':'-j REJECT'));
    }
   }
   return;
  }catch{if(attempt===maximum-1)throw Error(g.project+': exact-image health/boundary gate failed');await new Promise(r=>setTimeout(r,1000));}
 }
}
async function recreate(g){
 if(coupled.has(g.project)){execFileSync('systemctl',['restart',g.project+'.service'],{timeout:180000,stdio:'ignore'});return;}
 const wallabag=g.project==='utilibre-wallabag';
 const newsletters=g.project==='utilibre-newsletters';
 if(wallabag)execFileSync('systemctl',['stop','utilibre-wallabag.service'],{timeout:120000,stdio:'ignore'});
 if(newsletters)execFileSync('systemctl',['stop','utilibre-newsletters-smtp.service'],{timeout:120000,stdio:'ignore'});
 try{docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',...directlyRecreatedServices(g));}
 finally{if(wallabag)execFileSync('systemctl',['start','utilibre-wallabag.service'],{timeout:180000,stdio:'ignore'});if(newsletters)execFileSync('systemctl',['start','utilibre-newsletters-smtp.service'],{timeout:180000,stdio:'ignore'});}
}
export async function releaseGroup(g,ops){
 await ops.preflight();g.status='applying';await ops.save();
 try{await ops.recreate();await ops.gate('new');g.status='passed';await ops.save();}
 catch{
  g.status='failed';g.rollback='attempting';
  try{await ops.rollbackPins();await ops.recreate();await ops.gate('old');g.rollback='verified';}catch{g.rollback='unverified';}
  await ops.save();throw Error(g.project+': stopped; rollback '+g.rollback+'. No user-data restore or deletion attempted.');
 }
}
async function main(){
 await mkdir(dir,{recursive:true,mode:0o700});
 const mode=process.argv[2];assert(['prepare','pin','apply','retry'].includes(mode));
 if(mode==='prepare'){
  const runtimePath='/opt/utilibre/reports/language-runtime-pzov6360/result.json';
  const runtime=JSON.parse(await readFile(runtimePath));assert.equal(runtime.status,'passed');
  const forms=JSON.parse(await readFile('/var/lib/utilibre-maintenance/vendor-stage-20261011/liberaforms-language.json'));
  const auth=JSON.parse(await readFile('/var/lib/utilibre-maintenance/vendor-stage-20261011/authentik-language.json'));
  assert.equal(auth.nativePasswordAndTotpReplay,true);assert.equal(auth.rsaAndEcdsaOAuthCodeExchange,true);
  assert.equal(forms.blankDatabase,true);assert.equal(forms.nativeRequiredEncryptionFormCreation,true);assert.equal(forms.otherAndAnonymousDenied,true);
  const specs=[];for(const family of ['python','npm'])for(const s of JSON.parse(await readFile(new URL('./'+family+'-images.json',import.meta.url))))specs.push({...s,family});
  const reports=[];for(const name of await readdir('/opt/utilibre/reports'))if(name.startsWith('language-verify-'))try{reports.push({path:'/opt/utilibre/reports/'+name+'/result.json',...JSON.parse(await readFile('/opt/utilibre/reports/'+name+'/result.json'))});}catch{}
  const groups=new Map();
  for(const spec of specs){
   const candidate=inspect(spec.candidate);const verified=reports.find(r=>r.status==='passed'&&r.imageId===candidate.Id&&r.key===spec.key);assert(verified,'Missing exact candidate evidence: '+spec.key);assert(Date.now()-Date.parse(verified.verifiedAt)<86400000);
   assert(verified.applicationFilesUnchanged||verified.applicationDistributionsUnchanged,'Missing byte-equivalence evidence');
   if(spec.family==='python')assert(runtime.rows.some(r=>r.key===spec.key&&r.imageId===candidate.Id&&r.status==='passed'));
   if(spec.key==='authentik')assert.equal(auth.imageId,candidate.Id);
   if(spec.key==='liberaforms')assert.equal(forms.imageId,candidate.Id);
   for(const name of spec.containers){
    const x=inspect(name),l=x.Config.Labels;assert.equal(x.Image,spec.baseId,'Live source drift '+name);
    const project=l['com.docker.compose.project'];let g=groups.get(project);
    if(!g){g={project,cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared'};groups.set(project,g);}
    assert.equal(g.cwd,l['com.docker.compose.project.working_dir']);
    const service=l['com.docker.compose.service'],s=config(g)[service];assert.equal(inspect(s.image).Id,spec.baseId,'Compose image identity mismatch');
    g.rows.push({name,key:spec.key,service,oldRef:s.image,oldImage:spec.baseId,newRef:spec.candidate,newImage:candidate.Id,configHash:normalized(s),verification:verified.path});
   }
  }
  // Recreate same-image companions whose network namespace belongs to an
  // updated container. Otherwise an unchanged gateway can retain a dead netns.
  const selected=new Set([...groups.values()].flatMap(g=>g.rows.map(r=>r.name)));
  const containers=JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n')));
  for(const {container:x,parent} of namespaceDependents(containers,selected)){
   const name=x.Name.slice(1),l=x.Config.Labels,g=groups.get(l['com.docker.compose.project']);assert(g,'Cross-project namespace companion needs explicit review');
   assert.equal(g.cwd,l['com.docker.compose.project.working_dir']);const service=l['com.docker.compose.service'],s=config(g)[service];assert.equal(inspect(s.image).Id,x.Image);
   g.rows.push({name,key:'same-image-namespace-companion',service,oldRef:s.image,oldImage:x.Image,newRef:s.image,newImage:x.Image,configHash:normalized(s),namespaceParent:parent,verification:'Unchanged image; explicit companion restart and namespace-identity gate'});
  }
  const byId=new Map(containers.map(x=>[x.Id,x.Name.slice(1)]));
  for(const g of groups.values())for(const r of g.rows){const x=containers.find(x=>x.Name.slice(1)===r.name),parent=byId.get(x.HostConfig.NetworkMode.replace(/^container:/,''));if(parent&&g.rows.some(other=>other.name===parent))r.namespaceParent=parent;}
  if(groups.has('utilibre-services'))groups.get('utilibre-services').mirrorFiles=['/home/ubuntu/freetools/deployment/utilibre/compose.yaml'];
  for(const g of groups.values()){g.before=await status(g);assert(g.before.every(n=>n>=200&&n<500));for(const r of g.rows){const x=inspect(r.name);assert(x.State.Running);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');}}
  const files={};for(const g of groups.values())for(const f of g.files){const text=await readFile(f,'utf8');files[f]={beforeSha256:hash(text)};}
  // The active core stack lives under /opt; keep its checked-in source in sync.
  const source='/home/ubuntu/freetools/deployment/utilibre/compose.yaml';
  files[source]={beforeSha256:hash(await readFile(source,'utf8'))};
  const report={status:'prepared',date:new Date().toISOString(),runtimePath,groups:[...groups.values()],files};
  await writeFile(file,JSON.stringify(report,null,2)+'\n');console.log(`${specs.length} candidate images / ${report.groups.reduce((n,g)=>n+g.rows.length,0)} containers prepared; no live/config mutation.`);return;
 }
 const report=JSON.parse(await readFile(file));assert(Date.now()-Date.parse(report.date)<86400000,'Preparation expired');
 const save=()=>writeFile(file,JSON.stringify(report,null,2)+'\n');
 if(mode==='retry'){
  const g=report.groups.find(g=>g.project===process.argv[3]);assert(g&&g.status==='failed','Only the explicitly failed prepared group may be retried');
  await gate(g,'old');const current=config(g);
  for(const r of g.rows){assert.equal(current[r.service].image,r.oldRef);assert.equal(normalized(current[r.service]),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);}
  g.attempts=[...(g.attempts||[]),{status:g.status,rollback:'verified',verifiedAt:new Date().toISOString(),reason:'Original health wait raced native interval; exact old-image native health now passed'}];
  const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.oldRef,to:r.newRef}));
  for(const f of rollbackFiles(g)){const text=await readFile(f,'utf8'),out=replaceImagePins(text,pairs);if(out.replaced)await writeFile(f,out.text);}
  g.status='prepared';delete g.rollback;await save();console.log('Verified rollback and restored only the failed group candidate pins; invoke apply to resume.');return;
 }
 if(mode==='pin'){
  assert.equal(report.status,'prepared');
  // Root reviews and explicitly invokes this phase. Only exact image scalars change.
  const replacements=report.groups.flatMap(g=>g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.oldRef,to:r.newRef})));
  const staged=[];for(const [f,evidence] of Object.entries(report.files)){const text=await readFile(f,'utf8');assert.equal(hash(text),evidence.beforeSha256,'Source file changed: '+f);const changed=replaceImagePins(text,replacements);if(changed.replaced)staged.push({f,...changed});}
  for(const {f,text} of staged){await writeFile(f,text);report.files[f].pinnedSha256=hash(text);}
  for(const g of report.groups){const current=config(g);for(const r of g.rows){assert.equal(current[r.service].image,r.newRef);assert.equal(normalized(current[r.service]),r.configHash);}}
  report.status='pinned';await save();console.log('Exact image scalars updated; no container restarted.');return;
 }
 assert(['pinned','applying'].includes(report.status));report.status='applying';await save();
 for(const g of report.groups){
  const disk=await statfs('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB disk floor; resume after safe build-cache cleanup');
  if(g.status==='passed'){await gate(g,'new');continue;}
  const validate=(checkLive=true)=>{const current=config(g);for(const r of g.rows){assert.equal(current[r.service].image,r.newRef);assert.equal(normalized(current[r.service]),r.configHash);assert.equal(inspect(r.newRef).Id,r.newImage);assert.equal(inspect(r.oldRef).Id,r.oldImage);if(checkLive)assert([r.oldImage,r.newImage].includes(inspect(r.name).Image));}};
  await releaseGroup(g,{preflight:validate,save,recreate:()=>recreate(g),gate:v=>gate(g,v),rollbackPins:async()=>{
   validate(false);const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.newRef,to:r.oldRef}));
   for(const f of rollbackFiles(g)){const text=await readFile(f,'utf8'),out=replaceImagePins(text,pairs);if(out.replaced)await writeFile(f,out.text);}
   const current=config(g);for(const r of g.rows){assert.equal(current[r.service].image,r.oldRef);assert.equal(normalized(current[r.service]),r.configHash);}
  }});console.log(g.project+': exact images healthy, existing boundaries preserved');
 }
 report.status='passed';report.completedAt=new Date().toISOString();await save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

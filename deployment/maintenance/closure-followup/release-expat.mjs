// Exact existing-image replacement after isolated XML and application gates.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',file=dir+'/expat-release.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=x=>createHash('sha256').update(JSON.stringify(canonical(x))).digest('hex');
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const id=n=>docker('image','inspect',n,'--format','{{.Id}}');
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const configHash=s=>{const {image,...rest}=s;return sha(rest);};
const [mode,...selection]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));
const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),groups:[]},save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
async function gate(g,which){
 const limit=readinessSeconds([inspect(g.name)]);
 for(let attempt=0;attempt<limit;attempt++){
  try{const x=inspect(g.name);assert.equal(x.Image,g[which+'Image']);assert(x.State.Running);assert(x.RestartCount<=(which==='old'?(g.oldRestarts||0):0));assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
   if(which==='new')assert.equal(docker('exec',g.name,'dpkg-query','-W','-f=${Version}','libexpat1'),'2.9.0-1');return;
  }catch{if(attempt===limit-1)throw Error('Exact-image/native health gate failed: '+g.key);await new Promise(r=>setTimeout(r,1000));}
 }
}
function repin(g,from,to){let n=0;for(const file of [...g.files,...g.mirrors]){const r=replaceImagePins(fs.readFileSync(file,'utf8'),[{from,to}]);if(r.replaced){fs.writeFileSync(file,r.text);n+=r.replaced;}}assert(n>=1,'Exact pin missing');}
if(mode==='prepare'){
 const built=read(dir+'/expat-stage.json'),native=read(dir+'/expat-apps.json');assert.equal(built.status,'passed');assert.equal(native.status,'passed');
 assert(Date.now()-Date.parse(native.date)<86400000);
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 assert.deepEqual(namespaceDependents(all,new Set(built.rows.map(r=>r.name))),[],'Unreviewed namespace dependency');
 for(const b of built.rows){
  if(selection.length&&!selection.includes(b.key))continue;
  assert(native.rows.some(n=>n.key===b.key&&n.imageId===b.imageId&&n.passed));assert(!report.groups.some(g=>g.key===b.key),'Receipt already exists');
  const x=inspect(b.name),l=x.Config.Labels;assert.equal(x.Image,b.base);assert.equal(id(b.candidate),b.imageId);assert.equal(sha(inspect(b.base).Config),sha(inspect(b.imageId).Config));
  const g={key:b.key,name:b.name,service:l['com.docker.compose.service'],project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),mirrors:b.key==='rsshub'?['/home/ubuntu/freetools/deployment/utilibre/compose.yaml']:[],oldImage:b.base,newImage:b.imageId,newRef:b.candidate,status:'prepared',preparedAt:new Date().toISOString()};
  const c=config(g);g.oldRef=c.image;g.oldRestarts=x.RestartCount;g.configHash=configHash(c);assert.equal(id(g.oldRef),g.oldImage);await gate(g,'old');report.groups.push(g);save();console.log(g.key+': ready for exact image replacement');
 }
}else{
 for(const g of report.groups.filter(g=>!selection.length||selection.includes(g.key))){
  if(g.status==='passed'){await gate(g,'new');continue;}assert.equal(g.status,'prepared');assert(Date.now()-Date.parse(g.preparedAt)<86400000);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
  const validate=()=>{assert.equal(id(g.oldRef),g.oldImage);assert.equal(id(g.newRef),g.newImage);const c=config(g);assert.equal(configHash(c),g.configHash);assert([g.oldRef,g.newRef].includes(c.image));};
  let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();repin(g,g.newRef,g.oldRef);}});
  g.completedAt=new Date().toISOString();save();console.log(g.key+': deployed and healthy');
 }
}
report.status=report.groups.length&&report.groups.every(g=>g.status==='passed')?'passed':'prepared';report.updatedAt=new Date().toISOString();save();

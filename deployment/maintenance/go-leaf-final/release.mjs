// Seven bounded existing-service releases; no database or retention migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {replaceImagePins,namespaceDependents,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
import {canonical} from '../go-final/release.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/go-leaf-final-20261011',receipt=root+'/release.json';
const specs=JSON.parse(fs.readFileSync(new URL('./images.json',import.meta.url)));
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration output withheld.');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,...(g.project==='utilibre-community'?['--env-file',g.cwd+'/.env.rallly']:[]),'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const endpoints={
 'oauth2-proxy':['http://172.29.158.11:4180/ping','http://10.10.1.43:3227/oauth2/auth','https://grist.utilibre.org/'],
 mezzo:['http://172.29.74.10:8006/','http://10.10.1.43:3140/','https://tenor.utilibre.org/'],
 anubis:['http://10.10.1.43:3002/info','https://redlib.utilibre.org/info'],
 opengist:['http://10.10.1.43:3191/healthcheck','https://snippets.utilibre.org/'],
 ntfy:['http://10.10.1.43:3121/v1/health','https://notify.utilibre.org/v1/health'],
 vikunja:['http://10.10.1.43:3195/api/v1/info','https://tasks.utilibre.org/'],
 'wakapi-healthcheck':['http://10.10.1.43:3136/api/health','https://wakapi.utilibre.org/'],
};
export function validateEvidence(s,b,v,n){
 assert.equal(b.key,s.key);assert.equal(b.base,s.baseId);assert.equal(b.image,s.candidate);
 assert(/^sha256:[a-f0-9]{64}$/.test(b.imageId));assert.equal(b.runtimeConfigurationUnchanged,true);
 assert.equal(b.compiler,s.compiler);assert.equal(v.compiler,s.compiler);
 assert.equal(v.passed,true);assert.equal(v.imageId,b.imageId);
 assert.equal(n.passed,true);assert.equal(n.imageId,b.imageId);
 const changed=s.key==='wakapi-healthcheck'?['/app/healthcheck','/app/wakapi']:s.key==='oauth2-proxy'?['/usr/bin/oauth2-proxy']:[s.binary];
 assert.deepEqual(v.onlyChangedPaths,changed,'Unreviewed image file change');
 return b.imageId;
}
export function probeHeaders(key,url){
 // Anubis deliberately rejects ingress without its configured edge-IP header.
 // This synthetic loopback identity is confined to the private /info probe;
 // it must never be sent to public edge checks or used as crawler evidence.
 return key==='anubis'&&url==='http://10.10.1.43:3002/info'
  ?{Connection:'close',Host:'redlib.utilibre.org','CF-Connecting-IP':'127.0.0.1'}
  :{Connection:'close'};
}
async function statuses(g){
 const out=[];for(const url of endpoints[g.key]){const r=await fetch(url,{redirect:'manual',headers:probeHeaders(g.key,url),signal:AbortSignal.timeout(12000)});out.push(r.status);await r.body?.cancel();}return out;
}
async function gate(g,version){
 const max=readinessSeconds([inspect(g.name)]);
 for(let i=0;i<max;i++){
  try{const x=inspect(g.name);assert.equal(x.Image,g[version+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');break;}
  catch{if(i===max-1)throw Error(g.key+': exact native health failed');await new Promise(r=>setTimeout(r,1000));}
 }
 assert.deepEqual(await statuses(g),g.before,'Backend/gateway/public route changed');
 if(g.key==='oauth2-proxy')assert.equal(g.before[1],401,'Anonymous identity authorization must remain denied');
}
export function plannedPins(files,from,to){
 const edits=files.map(f=>({...f,...replaceImagePins(f.text,[{from,to}])}));
 assert.equal(edits.reduce((n,f)=>n+f.replaced,0),1,'Exactly one image scalar expected');
 return edits.filter(f=>f.replaced);
}
function repin(g,from,to){
 const edits=plannedPins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),from,to);
 for(const edit of edits)fs.writeFileSync(edit.file,edit.text);
}
async function main(){
 const [mode,...keys]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));assert(keys.length&&new Set(keys).size===keys.length);for(const key of keys)assert(specs.some(s=>s.key===key));
 const report=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt)):{date:new Date().toISOString(),status:'preparing',groups:[]};
 const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
 if(mode==='prepare'){
  for(const key of keys){
   assert(!report.groups.some(g=>g.key===key),'Do not overwrite an existing release receipt');
   const s=specs.find(s=>s.key===key),name=key==='wakapi-healthcheck'?'wakapi':key;
   const read=suffix=>JSON.parse(fs.readFileSync(root+'/output/'+name+'-'+suffix+'.json'));
   const imageId=validateEvidence(s,read('image'),read('verify'),read('native'));
   assert.equal(inspect(s.candidate).Id,imageId);const x=inspect(s.container),l=x.Config.Labels;assert.equal(x.Image,s.baseId);
   const g={key,name:s.container,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],oldImage:s.baseId,newImage:imageId,newRef:s.candidate,status:'prepared',preparedAt:new Date().toISOString()};
   const c=config(g);assert.equal(inspect(c.image).Id,s.baseId);g.oldRef=c.image;g.configHash=hash(c);g.before=await statuses(g);
   assert(g.before.every(code=>code>=200&&code<400||code===401),'Baseline route is not operational');
   const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));assert.deepEqual(namespaceDependents(all,new Set([g.name])),[],'Unreviewed shared-network dependent');
   await gate(g,'old');report.groups.push(g);save();console.log(key+': prepared, production unchanged');
  }return;
 }
 for(const key of keys){
  const g=report.groups.find(g=>g.key===key);assert(g);assert(Date.now()-Date.parse(g.preparedAt)<86400000);assert(['prepared','passed'].includes(g.status));
  if(g.status==='passed'){await gate(g,'new');continue;}
  const disk=fs.statfsSync(root);assert(disk.bavail*disk.bsize>=8*1024**3,'Eight-GiB floor');
  const validate=()=>{assert.equal(inspect(g.oldRef).Id,g.oldImage);assert.equal(inspect(g.newRef).Id,g.newImage);const c=config(g);assert.equal(hash(c),g.configHash);assert([g.oldRef,g.newRef].includes(c.image));};
  let rollback=false;
  await releaseGroup(g,{preflight:()=>{validate();assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);plannedPins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),g.oldRef,g.newRef);},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);assert.equal(config(g).image,rollback?g.oldRef:g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();if(config(g).image===g.newRef)repin(g,g.newRef,g.oldRef);}});
  g.completedAt=new Date().toISOString();save();console.log(key+': exact live image/native health/routes passed');
 }
 report.status=report.groups.length===specs.length&&report.groups.every(g=>g.status==='passed')?'passed':'partial';report.updatedAt=new Date().toISOString();if(report.status==='passed')report.completedAt=report.updatedAt;save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

// Finite image-only follow-up. Never prints resolved environments or live data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {specs,output} from './specs.mjs';
import {canonical} from '../go-final/release.mjs';
import {plannedPins} from '../go-leaf-final/release.mjs';
import {namespaceDependents,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const receipt=output+'/release.json';
const targets=[...specs,{key:'projects',container:'utilibre-projects-app-1',base:'sha256:6241eed79c9e9802ab7069dd34002a106771f1a169799b479709d7f3fd5acd8f',candidate:'utilibre-projects:455aa274-redis-example-security-20261012'},{key:'bookplate',container:'utilibre-records-bookplate-1',base:'sha256:9994dbe98020f667b88880041455efcd4e5cb08786427a8b7682f205869779af',candidate:'utilibre-bookplate:1.1.0-next1638-security-20261012'}];
const run=(exe,args)=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded release operation failed; command output withheld.');}};
const docker=(...args)=>run('docker',args);
// Whitelist only operational fields. In particular, never fetch Config.Env.
const format='{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}},"Healthcheck":{{json (index .Config "Healthcheck")}}},"State":{"Running":{{json .State.Running}},"StartedAt":{{json .State.StartedAt}},"Health":{{json (index .State "Health")}}},"RestartCount":{{json .RestartCount}},"HostConfig":{"NetworkMode":{{json .HostConfig.NetworkMode}}}}';
const inspect=n=>JSON.parse(docker('inspect','--format',format,n));
const image=n=>docker('image','inspect','--format','{{.Id}}',n);
function noDependents(name){const all=docker('inspect','--format',format,...docker('ps','-q').split('\n')).split('\n').map(s=>JSON.parse(s));assert.deepEqual(namespaceDependents(all,new Set([name])),[],'Unreviewed namespace dependent');}
const compose=g=>['compose','--profile','*','--project-directory',g.cwd,'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const urls={admin:['https://design.utilibre.org/'],degoog:['http://127.0.0.1:3143/readyz','https://degoog.utilibre.org/'],candlr:['http://10.10.1.43:3228/login','https://candlr.utilibre.org/login'],projects:['http://127.0.0.1:3217/','https://projects.utilibre.org/'],bookplate:['http://10.10.1.43:3229/','https://bookplate.utilibre.org/']};
export function fresh(date){const n=Date.parse(date);assert(Number.isFinite(n)&&n<=Date.now()+300000&&Date.now()-n<86400000,'Native evidence must be recent');}
export function evidence(s,b,n,l){
 assert.equal(b.passed,true);assert.equal(b.configurationUnchanged,true);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.container,s.container);
 assert(/^sha256:[a-f0-9]{64}$/.test(b.imageId));
 for(const r of [n,l]){assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);fresh(r.date);}
 assert.equal(n.libraryGate,true);assert.equal(n.productionChanged,false);
 assert.equal(n.applicationParity.length,2);assert.equal(n.applicationParity[0].imageId,s.base);assert.equal(n.applicationParity[1].imageId,b.imageId);
 return b.imageId;
}
function candidateEvidence(s){
 if(s.key==='bookplate'){
  const read=kind=>JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/next-leaves-final-20261012/bookplate-'+kind+'.json'));
  const b=read('image'),n=read('native'),v=read('verify');
  for(const r of [b,n,v]){fresh(r.date);assert.equal(r.passed,true);assert.equal(r.imageId,b.imageId);}
  assert.equal(b.base,s.base);assert.equal(b.image,s.candidate);assert.equal(b.unchangedRuntime,true);assert.equal(v.base,s.base);assert.equal(v.onlyApplicationTreeChanged,true);assert.equal(v.publicMigrationsNativeAdminHelpersIdentical,true);assert.equal(v.next,'16.3.8');assert.equal(v.nextFindings,0);assert.equal(v.productionChanged,false);return b.imageId;
 }
 if(s.key==='projects'){
  const r=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/projects-redis-final-20261012/result.json'));
  fresh(r.completedAt);assert.equal(r.status,'passed');assert.equal(r.baseId,s.base);assert.equal(r.candidate,s.candidate);assert.equal(r.allOtherImageFilesUnchanged,true);assert.equal(r.removedFiles,45);assert.equal(r.removedPath,'/app/node_modules/redis/heroku/');assert.equal(r.redisFindingAbsentFromActualCandidateScan,true);assert.equal(r.native.passed,true);assert.equal(r.productionChanged,false);return r.imageId;
 }
 const read=name=>JSON.parse(fs.readFileSync(output+'/'+s.key+'/'+name+'.json'));return evidence(s,read('build'),read('native'),read('libraries'));
}
async function statuses(g){
 const result=[];
 if(g.key==='admin')result.push(Number(docker('exec',g.name,'node','-e',"fetch('http://127.0.0.1:3000/',{redirect:'manual'}).then(async r=>{await r.body?.cancel();console.log(r.status)}).catch(()=>process.exit(1))")));
 for(const url of urls[g.key]){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});result.push(r.status);await r.body?.cancel();}
 return result;
}
async function gate(g,which){
 const max=readinessSeconds([inspect(g.name)]);
 for(let i=0;i<max;i++){
  try{const x=inspect(g.name);assert.equal(x.Image,g[which+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');assert.deepEqual(await statuses(g),g.before);
   if(g.key==='projects'){
    run('systemctl',['is-active','--quiet','utilibre-projects-firewall.service']);
    run('iptables',['-w','-C','DOCKER-USER','-j','UTILIBRE-PROJECTS']);
    for(const subnet of ['172.29.148.0/24','172.29.149.0/24']){run('iptables',['-w','-C','UTILIBRE-PROJECTS','-s',subnet,'-j','DROP']);run('iptables',['-w','-C','INPUT','-s',subnet,'-m','conntrack','--ctstate','NEW','-j','DROP']);}
    const r=await fetch('https://projects.utilibre.org/api/projects',{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();assert.equal(r.status,401,'Anonymous project listing denied');
   }
   if(g.key==='bookplate')for(const pathname of ['/api/client-errors','/uploads/','/api/metrics','/s/']){const r=await fetch('https://bookplate.utilibre.org'+pathname,{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();assert.equal(r.status,404,'Private image/sharing/telemetry boundary');}
   return;}
  catch{if(i===max-1)throw Error(g.key+': live image/health/route gate failed');await new Promise(r=>setTimeout(r,1000));}
 }
}
function repin(g,from,to){for(const e of plannedPins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),from,to))fs.writeFileSync(e.file,e.text);}
async function main(){
 const[mode,...keys]=process.argv.slice(2);assert(['prepare','apply'].includes(mode));assert(keys.length&&new Set(keys).size===keys.length);for(const k of keys)assert(targets.some(s=>s.key===k));
 const report=fs.existsSync(receipt)?JSON.parse(fs.readFileSync(receipt)):{groups:[],status:'preparing'};
 const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
 for(const key of keys){
  if(mode==='prepare'){
   assert(!report.groups.some(g=>g.key===key),'Do not overwrite a release receipt');
   const s=targets.find(s=>s.key===key),newImage=candidateEvidence(s);assert.equal(image(s.candidate),newImage);
   const imageConfig=id=>createHash('sha256').update(docker('image','inspect','--format','{{json .Config}}',id)).digest('hex');assert.equal(imageConfig(newImage),imageConfig(s.base),'Image configuration changed');
   const x=inspect(s.container),l=x.Config.Labels;assert.equal(x.Image,s.base);
   const g={key,name:s.container,oldImage:s.base,newImage,newRef:s.candidate,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],preparedAt:new Date().toISOString(),status:'prepared'};
   const c=config(g);g.oldRef=c.image;assert.equal(image(g.oldRef),g.oldImage);g.configHash=hash(c);g.before=await statuses(g);assert(g.before.every(v=>v>=200&&v<400));
   noDependents(g.name);
   plannedPins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),g.oldRef,g.newRef);await gate(g,'old');report.groups.push(g);save();console.log(key+': prepared; production unchanged');continue;
  }
  const g=report.groups.find(g=>g.key===key);assert(g&&Date.now()-Date.parse(g.preparedAt)<86400000);assert(['prepared','passed'].includes(g.status));
  if(g.status==='passed'){await gate(g,'new');continue;}
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB reserve');
  const validate=()=>{assert.equal(image(g.oldRef),g.oldImage);assert.equal(image(g.newRef),g.newImage);const c=config(g);assert.equal(hash(c),g.configHash);assert([g.oldRef,g.newRef].includes(c.image));};let rollback=false;
  await releaseGroup(g,{preflight:async()=>{validate();noDependents(g.name);assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);plannedPins(g.files.map(file=>({file,text:fs.readFileSync(file,'utf8')})),g.oldRef,g.newRef);await gate(g,'old');},save,recreate:()=>{validate();if(!rollback)repin(g,g.oldRef,g.newRef);assert.equal(config(g).image,rollback?g.oldRef:g.newRef);docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>gate(g,v),rollbackPins:()=>{rollback=true;validate();if(config(g).image===g.newRef)repin(g,g.newRef,g.oldRef);}});
  g.completedAt=new Date().toISOString();save();console.log(key+': deployed; exact image, native health and route parity passed');
 }
 report.status=report.groups.length===targets.length&&report.groups.every(g=>g.status==='passed')?'passed':'partial';report.updatedAt=new Date().toISOString();save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

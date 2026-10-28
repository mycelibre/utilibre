// Finite same-source Go release; no database, room or user-content migration.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {replaceImagePins, namespaceDependents, releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const oct28=process.argv.includes('--oct28'),dir=oct28?'/var/lib/utilibre-maintenance/security-20261028/go':'/var/lib/utilibre-maintenance/go-final-20261011',file=dir+'/release.json';
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration output withheld.');}};
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const compose=g=>['compose','--project-directory',g.cwd,'-p',g.project,...g.files.flatMap(f=>['-f',f])];
const config=g=>JSON.parse(docker(...compose(g),'config','--format','json')).services[g.service];
export const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
const configHash=s=>{const {image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const endpoints={rimgo:['http://172.29.90.10:3000/about','http://10.10.1.43:3153/about'],galene:['http://10.10.1.43:3178/'],safetwitch:['http://172.29.80.10:7000/','http://10.10.1.43:3146/'],gothub:['http://172.29.82.10:3000/about','http://10.10.1.43:3148/about'],anonymousoverflow:['http://172.29.81.10:8080/','http://10.10.1.43:3147/']};
export function establishedOnPort(tables,port){
 let listeners=0,established=0;
 for(const table of tables){
  const lines=table.trim().split('\n');assert(lines[0]?.includes('local_address'),'Missing native TCP table');
  for(const line of lines.slice(1)){const fields=line.trim().split(/\s+/);assert(fields.length>=4,'Malformed native TCP row');const local=fields[1].split(':');assert(local.length===2&&/^[0-9a-f]+$/i.test(local[1]));if(parseInt(local[1],16)!==port)continue;if(fields[3]==='0A')listeners++;if(fields[3]==='01')established++;}
 }
 assert(listeners>0,'Galene native HTTP listener absent');return established;
}
function galeneConnections(g){const x=inspect(g.name);assert(x.State.Running&&x.State.Pid>0);return establishedOnPort(['tcp','tcp6'].map(n=>fs.readFileSync('/proc/'+x.State.Pid+'/net/'+n,'utf8')),8080);}
async function health(g,version){
 for(let i=0;i<60;i++){
  try{
   const x=inspect(g.name);assert.equal(x.Image,g[version+'Image']);assert(x.State.Running);assert.equal(x.RestartCount,0);assert(Date.now()-Date.parse(x.State.StartedAt)>3000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
   const status=[];for(const url of endpoints[g.key]){const r=await fetch(url,{redirect:'manual',headers:{Connection:'close'},signal:AbortSignal.timeout(3000)});status.push(r.status);await r.body?.cancel();}assert.deepEqual(status,g.before);return;
  }catch{if(i===59)throw Error(g.key+': native HTTP/identity gate failed');await new Promise(r=>setTimeout(r,1000));}
 }
}
function repin(g,from,to){let count=0;for(const f of g.files){const old=fs.readFileSync(f,'utf8'),out=replaceImagePins(old,[{from,to}]);if(out.replaced){fs.writeFileSync(f,out.text);count+=out.replaced;}}assert.equal(count,1,'Expected exactly one service image scalar');}
async function main(){
 const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
 if(mode==='prepare'){
  const build=JSON.parse(fs.readFileSync(dir+'/build.json')),inventory=JSON.parse(fs.readFileSync(dir+'/inventory.json')),native=JSON.parse(fs.readFileSync(dir+'/native.json')),galene=JSON.parse(fs.readFileSync(dir+'/galene-native.json'));
  for(const r of [build,inventory,native,galene])assert.equal(r.status,'passed');
  const groups=[];
  for(const s of build.rows){
   if(oct28){const scan=JSON.parse(fs.readFileSync(dir+'/'+s.key+'/scan-gate.json'));assert(scan.passed&&scan.imageId===s.imageId&&scan.base===s.baseId&&scan.newHighCritical===0&&Date.now()-Date.parse(scan.advisoryUpdatedAt)<48*3600000);}
   const x=inspect(s.container),l=x.Config.Labels;assert.equal(x.Image,s.baseId);assert(x.State.Running);assert.equal(inspect(s.candidate).Id,s.imageId);
   assert(inventory.rows.some(r=>r.key===s.key&&r.imageId===s.imageId&&r.status==='passed'));
   if(s.key==='galene')assert.equal(galene.imageId,s.imageId);else assert(native.rows.some(r=>r.key===s.key&&r.imageId===s.imageId&&r.status==='passed'));
   const g={key:s.key,name:s.container,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),service:l['com.docker.compose.service'],oldRef:s.base,oldImage:s.baseId,newRef:s.candidate,newImage:s.imageId,status:'prepared'};
   assert.equal(config(g).image,g.oldRef);g.configHash=configHash(config(g));g.before=[];
   for(const url of endpoints[g.key]){const r=await fetch(url,{redirect:'manual',headers:{Connection:'close'},signal:AbortSignal.timeout(5000)});assert.equal(r.status,200,g.key+' baseline HTTP');g.before.push(r.status);await r.body?.cancel();}
   if(g.key==='galene')g.aggregateConnectionsAtPreparation=galeneConnections(g);groups.push(g);
  }
  const containers=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));assert.deepEqual(namespaceDependents(containers,new Set(groups.map(g=>g.name))),[],'Unreviewed namespace dependent');
  fs.writeFileSync(file,JSON.stringify({status:'prepared',date:new Date().toISOString(),groups},null,2)+'\n');console.log('Five exact Go releases prepared without production mutation.');return;
 }
 const report=JSON.parse(fs.readFileSync(file));assert(['prepared','applying','partially-deferred'].includes(report.status));assert(Date.now()-Date.parse(report.date)<86400000);assert.equal(report.groups.length,5);
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');report.status='applying';save();
 for(const g of report.groups){
  const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB global disk floor');
  if(g.status==='passed'){await health(g,'new');continue;}
  const validate=()=>{if(oct28){const scan=JSON.parse(fs.readFileSync(dir+'/'+g.key+'/scan-gate.json'));assert(scan.passed&&scan.imageId===g.newImage&&Date.now()-Date.parse(scan.advisoryUpdatedAt)<48*3600000);}assert.equal(inspect(g.oldRef).Id,g.oldImage);assert.equal(inspect(g.newRef).Id,g.newImage);assert.equal(configHash(config(g)),g.configHash);assert([g.oldRef,g.newRef].includes(config(g).image));};
  validate();
  if(g.key==='galene'&&galeneConnections(g)!==0){g.status='deferred-active-connections';g.reason='Native established HTTP/WebSocket connection count is nonzero; no meeting or client identifiers inspected.';save();continue;}
  let rollback=false,touchedRuntime=false;
  await releaseGroup(g,{preflight:()=>{validate();assert.equal(inspect(g.name).Image,g.oldImage);assert.equal(config(g).image,g.oldRef);if(g.key==='galene')assert.equal(galeneConnections(g),0,'A connection appeared; no restart permitted');},save,recreate:()=>{validate();if(rollback&&!touchedRuntime)return;if(!rollback){if(g.key==='galene')assert.equal(galeneConnections(g),0,'A connection appeared; no restart permitted');repin(g,g.oldRef,g.newRef);}assert.equal(config(g).image,rollback?g.oldRef:g.newRef);touchedRuntime=true;docker(...compose(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never',g.service);},gate:v=>health(g,v),rollbackPins:()=>{rollback=true;validate();if(config(g).image===g.newRef)repin(g,g.newRef,g.oldRef);}});
  g.verifiedAt=new Date().toISOString();save();console.log(g.key+': exact new image/native HTTP verified');
 }
 report.status=report.groups.every(g=>g.status==='passed')?'passed':'partially-deferred';report.completedAt=new Date().toISOString();save();
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

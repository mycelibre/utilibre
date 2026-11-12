// Explicit, finite Gathio dependency release; reuse the existing release driver.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {existingComposeArgs,replaceImagePins,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../../language-final/release.mjs';
import {acquireReleaseLock} from '../../security-20261103/release-lock.mjs';
import {publishSourceIndex} from '../../../../scripts/publish-source-index.mjs';
process.umask(0o077);
assert.equal(process.argv.length,3);assert(['--check','--apply'].includes(process.argv[2]));
const repo=fileURLToPath(new URL('../../../../',import.meta.url));
const root='/var/lib/utilibre-maintenance/releases-20261112/gathio';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bounded command failed; output withheld: '+p);}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const proof=read(root+'/candidate.json');assert(proof.approved);
for(const [p,h] of Object.entries(proof.evidence))assert.equal(sha(root+'/'+p),h);
for(const [p,h] of Object.entries(proof.files))assert.equal(sha(repo+p),h);
assert.equal(sha(fileURLToPath(new URL('./check-native.mjs',import.meta.url))),proof.checkerSha256);
assert.equal(sha(proof.source.archive),proof.source.sha256);
assert(Date.now()-Date.parse(proof.date)<86400000,'Candidate evidence expired');
const scan=read(root+'/scan-candidate.json');assert.equal(scan.Metadata.ImageID,proof.imageId);
assert(scan.Results.some(r=>r.Packages?.length));
assert(!scan.Results.some(r=>(r.Vulnerabilities||[]).some(v=>['CRITICAL','HIGH'].includes(v.Severity))));
assert(Date.now()-Date.parse(read('/var/cache/utilibre-security/db/metadata.json').UpdatedAt)<48*3600000);
const native=read(root+'/native.json'),built=read(root+'/runtime/build.json');
assert(native.passed&&built.passed&&built.configurationUnchanged);assert.equal(native.imageId,proof.imageId);
assert.equal(built.base,proof.base);assert.equal(built.imageId,proof.imageId);
const disk=fs.statfsSync('/');assert(disk.bavail*disk.bsize>=8*1024**3);
const name='utilibre-gathio-gathio-1',gatewayName='utilibre-gathio-gateway-1';
const x=inspect(name),gateway=inspect(gatewayName);assert.equal(x.Image,proof.base);
assert.equal(inspect(proof.candidate).Id,proof.imageId);assert.equal(x.State.Health.Status,'healthy');
const file=repo+'deployment/calendar/compose.gathio.yaml',before=fs.readFileSync(file,'utf8');
const labels=x.Config.Labels,g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name,service:'gathio',oldImage:x.Image,newImage:proof.imageId,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
assert.equal(g.project,'utilibre-gathio');assert.deepEqual(g.files,[file]);
const change=replaceImagePins(before,[{from:x.Config.Image,to:proof.candidate}]);assert.equal(change.replaced,1);
const shape=()=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const original=shape(),expected=structuredClone(original);expected.services.gathio.image=proof.candidate;
const companions=['utilibre-gathio-postgres-1','utilibre-gathio-ferretdb-1',gatewayName].map(n=>({name:n,id:inspect(n).Id}));
const destination='/opt/utilibre/toolbox-public',source=proof.source.publicName;
assert(fs.readFileSync(repo+'deployment/toolbox/source-index.html','utf8').includes('href="'+source+'"'));
if(process.argv[2]==='--check'){console.log('Gathio exact-image, evidence, source, configuration and scope checks passed; production unchanged.');process.exit(0);}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);
assert(!fs.existsSync(root+'/release.json'),'Preserve existing release evidence');
const record={startedAt:new Date().toISOString(),scope:proof.scope,base:proof.base,imageId:proof.imageId,source:{url:'https://tools.utilibre.org/utilibre-source/'+source,sha256:proof.source.sha256},groups:[g],gatewayReloaded:false,checks:[],liveDataWrittenByTests:false};
const save=()=>fs.writeFileSync(root+'/release.json',JSON.stringify(record,null,2)+'\n');
async function status(url){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});await r.body?.cancel();record.checks.push({url,status:r.status});return r.status;}
const health='http://10.10.1.43:3198/';assert.equal(await status(health),200);
await releaseGroup(g,{
 save,
 preflight:async()=>{
  assert.equal(inspect(name).Id,x.Id);assert.equal(fs.readFileSync(file,'utf8'),before);
  const target=destination+'/'+source;
  if(fs.existsSync(target))assert.equal(sha(target),proof.source.sha256);
  else{const stage=fs.mkdtempSync('/opt/utilibre/gathio-source-update-');fs.copyFileSync(proof.source.archive,stage+'/'+source);assert.equal(sha(stage+'/'+source),proof.source.sha256);fs.chmodSync(stage+'/'+source,0o644);fs.renameSync(stage+'/'+source,target);}
  record.source.previousIndex=publishSourceIndex(destination);
  assert.equal(await status(record.source.url),200);record.source.published=true;
  fs.writeFileSync(root+'/compose.before.yaml',before);
 },
 recreate:async()=>{if(!g.rollback){fs.writeFileSync(file,change.text);assert.deepEqual(shape(),expected);}await recreateExistingGroup(g);},
 gate:async version=>{
  await checkExistingGroup(g,version);for(const c of companions)assert.equal(inspect(c.name).Id,c.id);
  assert.deepEqual(inspect(name).Mounts,x.Mounts);
  for(const [p,h] of Object.entries(proof.files))if(repo+p!==file)assert.equal(sha(repo+p),h);
  let response=await status(health);
  // The deployed gateway already refreshes Docker DNS every 30 seconds.
  // Allow its supported recovery interval; a transient 502 is not an app failure.
  for(let n=0;n<20&&[502,503,504].includes(response);n++){
   await new Promise(r=>setTimeout(r,2000));response=await status(health);
  }
  if(response!==200){
   const ips=c=>Object.values(c.NetworkSettings.Networks).map(n=>n.IPAddress).sort();
   assert([502,503,504].includes(response));assert.notDeepEqual(ips(x),ips(inspect(name)));
   docker('exec',gatewayName,'nginx','-t');docker('exec',gatewayName,'nginx','-s','reload');record.gatewayReloaded=true;
   for(let n=0;n<4&&response!==200;n++){await new Promise(r=>setTimeout(r,500));response=await status(health);}
  }
  assert.equal(response,200);
  assert.equal(await status('https://events.utilibre.org/'),200);
  const versionText=docker('exec',name,'node','-p',"require('mongoose/package.json').version").trim();
  assert.equal(versionText,version==='new'?'6.13.12':'6.13.11');record.mongoose=versionText;
 },
 rollbackPins:async()=>{fs.writeFileSync(file,before);assert.deepEqual(shape(),original);}
});
record.completedAt=new Date().toISOString();record.status=g.status;record.composeSha256=sha(file);record.databaseAndGatewayContainersUnchanged=true;save();
console.log('Gathio repair deployed; exact image, Mongoose version, health and source publication verified.');

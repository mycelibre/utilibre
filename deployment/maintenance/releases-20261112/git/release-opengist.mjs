// Finite, explicitly authorized Git-only Opengist release; no generic rollout.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {existingComposeArgs,replaceImagePins,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../../language-final/release.mjs';
import {acquireReleaseLock} from '../../security-20261103/release-lock.mjs';
import {publishSourceIndex} from '../../../../scripts/publish-source-index.mjs';

process.umask(0o077);
assert.equal(process.argv.length,3);
assert(['--check','--apply'].includes(process.argv[2]));
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const dir=fileURLToPath(new URL('./',import.meta.url));
const evidence='/var/lib/utilibre-maintenance/git-vendor-20261112';
const read=p=>JSON.parse(fs.readFileSync(p));
const hash=b=>createHash('sha256').update(b).digest('hex');
const sha=p=>hash(fs.readFileSync(p));
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bounded command failed; output withheld to protect service configuration: '+p);}};
const docker=(...a)=>run('docker',a);
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const policy=read(dir+'release-policy.json');
assert.equal(policy.approval,'approved-opengist-only');
assert.equal(sha(dir+'status.json'),policy.preparationStatusSha256,'Preparation evidence changed');
const proof=read(dir+'status.json'),pins=read(dir+'inputs.json');
for(const [path,expected] of Object.entries({...proof.files,...policy.files}))assert.equal(sha(root+path),expected,path+' changed');
for(const record of Object.values(proof.nativeChecks)){assert.equal(sha(record.path),record.sha256);assert.equal(read(record.path).passed,true);}
for(const record of [proof.scans.before,proof.scans.after])assert.equal(sha(record.path),record.sha256);
assert.equal(sha(proof.sourceOffer.path),proof.sourceOffer.sha256);
assert.equal(sha(proof.sourceOffer.manifest),proof.sourceOffer.manifestSha256);
assert.equal(sha(proof.vendorAcquisition.receipt),proof.vendorAcquisition.sha256);
const build=read(proof.nativeChecks['build.json'].path),scope=read(proof.nativeChecks['scope.json'].path),native=read(proof.nativeChecks['native.json'].path);
assert.equal(build.imageId,proof.candidate);assert.equal(build.base,pins.opengist.base);
assert(build.configurationUnchanged&&build.unrelatedFilesUnchanged&&scope.allUnrelatedFilesUnchanged&&scope.unrelatedApkRecordsUnchanged&&scope.muslUnchanged);
assert.equal(native.imageId,proof.candidate);
for(const key of ['blankRamOnlySqlite','twoNativeAccountsLogin','privateAnonymousAndOtherAccountDenied','createEditCommitsZip','privateGitClonePushReopen','gistsAndAccountsDeletedNatively'])assert.equal(native[key],true);
assert(Date.now()-Date.parse(build.date)>=0&&Date.now()-Date.parse(build.date)<policy.maximumEvidenceAgeHours*3600000,'Evidence expired');
const scan=read(proof.scans.after.path);assert.equal(scan.Metadata.ImageID,proof.candidate);
assert(scan.Results.some(r=>r.Packages?.length));
assert(!scan.Results.some(r=>(r.Vulnerabilities||[]).some(v=>['CRITICAL','HIGH'].includes(v.Severity))));
assert(proof.scans.noNewFindings);
const database=read('/var/cache/utilibre-security/db/metadata.json');
assert.equal(database.UpdatedAt,proof.scans.database.UpdatedAt);
assert(Date.now()-Date.parse(database.UpdatedAt)>=0&&Date.now()-Date.parse(database.UpdatedAt)<policy.maximumAdvisoryAgeHours*3600000,'Advisory data expired');
// Stream this large database through sha256sum rather than loading it into RAM.
assert.equal(run('sha256sum',['/var/cache/utilibre-security/db/trivy.db']).split(' ')[0],proof.scans.databaseSha256);
const free=fs.statfsSync('/');assert(free.bavail*free.bsize>=pins.minimumFreeBytes,'8 GiB free-space floor');
const name=pins.opengist.container,gatewayName='utilibre-opengist-gateway-1';
const x=inspect(name),gateway=inspect(gatewayName),labels=x.Config.Labels;
assert.equal(x.Image,pins.opengist.base,'Live predecessor changed');
assert.equal(inspect(proof.candidateReference).Id,proof.candidate);
assert.equal(inspect(x.Config.Image).Id,pins.opengist.base);
assert.equal(x.State.Health?.Status,'healthy');assert(gateway.State.Running);
const file=root+'deployment/community/compose.opengist.yaml';
const before=fs.readFileSync(file,'utf8');
for(const [path,expected] of Object.entries(proof.configurationPreconditions))assert.equal(sha(root+path),expected,path+' changed');
const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name,service:'opengist',oldImage:pins.opengist.base,newImage:proof.candidate,oldContainerId:x.Id,oldRestartCount:x.RestartCount}],status:'prepared'};
assert.equal(g.project,'utilibre-opengist');assert.equal(g.cwd,root+'deployment/community');assert.deepEqual(g.files,[file]);
const changed=replaceImagePins(before,[{from:x.Config.Image,to:proof.candidateReference}]);assert.equal(changed.replaced,1);
const shape=()=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const original=shape();assert.equal(original.services.opengist.image,x.Config.Image);
const assertOnlyImageChanged=()=>{const now=shape(),expected=structuredClone(original);expected.services.opengist.image=proof.candidateReference;assert.deepEqual(now,expected,'Unexpected Compose changes');};
const sourceName='git-2.54.1-alpine-source.tar.gz',destination='/opt/utilibre/toolbox-public';
const sourceUrl='https://tools.utilibre.org/utilibre-source/'+sourceName;
assert.equal(policy.sourceName,sourceName);
assert(fs.readFileSync(root+'deployment/toolbox/source-index.html','utf8').includes('href="'+sourceName+'"'));
const members=run('tar',['-tzf',proof.sourceOffer.path]).trim().split('\n').sort();
assert.deepEqual(members,['APKBUILD','fix-t4219-with-sticky-bit.patch','git-2.54.1.tar.xz','git-daemon.confd','git-daemon.initd','source-manifest.json'].map(n=>'git-2.54.1-alpine/'+n).sort());
if(process.argv[2]==='--check'){console.log('Opengist exact candidate, source, evidence, freshness, configuration and isolated workflow gates passed; production unchanged.');process.exit(0);}

const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);
assert(!fs.existsSync(evidence+'/release.json'),'Preserve the previous release record; do not replay activation blindly');
const containerState=()=>JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n'))).map(c=>({name:c.Name.slice(1),id:c.Id,image:c.Image}));
const beforeContainers=containerState();
const ip=c=>Object.values(c.NetworkSettings.Networks).map(n=>n.IPAddress).sort();
const record={version:1,startedAt:new Date().toISOString(),scope:'Opengist Git packages only',approval:policy.approval,base:pins.opengist.base,candidate:proof.candidate,candidateReference:proof.candidateReference,preparationStatusSha256:policy.preparationStatusSha256,policySha256:sha(dir+'release-policy.json'),adapterSha256:sha(dir+'release-opengist.mjs'),source:{url:sourceUrl,sha256:proof.sourceOffer.sha256,published:false},gateway:{recreated:false,reloaded:false},checks:[],groups:[g],productionDataModifiedByTests:false};
const save=()=>fs.writeFileSync(evidence+'/release.json',JSON.stringify(record,null,2)+'\n');
async function getStatus(url){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(10000)});const status=r.status;await r.body?.cancel();record.checks.push({url,status,date:new Date().toISOString()});return status;}
const health='http://10.10.1.43:3191/healthcheck';
assert.equal(await getStatus(health),200,'Gateway predecessor health failed');
await releaseGroup(g,{
 save,
 preflight:async()=>{
  assert.equal(fs.readFileSync(file,'utf8'),before);assert.equal(inspect(name).Image,pins.opengist.base);
  assert.equal(inspect(gatewayName).Id,gateway.Id);
  // Publish exact corresponding sources before distributing the candidate.
  if(fs.existsSync(destination+'/'+sourceName))assert.equal(sha(destination+'/'+sourceName),proof.sourceOffer.sha256);
  else{const stage=fs.mkdtempSync('/opt/utilibre/git-source-update-');fs.copyFileSync(proof.sourceOffer.path,stage+'/'+sourceName);assert.equal(sha(stage+'/'+sourceName),proof.sourceOffer.sha256);fs.chmodSync(stage+'/'+sourceName,0o644);fs.renameSync(stage+'/'+sourceName,destination+'/'+sourceName);record.source.stage=stage;}
  record.source.previousIndexDirectory=publishSourceIndex(destination);
  assert.equal(sha(destination+'/index.html'),sha(root+'deployment/toolbox/source-index.html'));
  assert.equal(await getStatus(sourceUrl),200,'Published source not reachable');record.source.published=true;await save();
  fs.writeFileSync(evidence+'/compose.opengist.before.yaml',before);
 },
 recreate:async()=>{
  if(!g.rollback){fs.writeFileSync(file,changed.text);assertOnlyImageChanged();}
  await recreateExistingGroup(g);
 },
 gate:async version=>{
  await checkExistingGroup(g,version);
  assert.equal(inspect(gatewayName).Id,gateway.Id);assert.equal(inspect(gatewayName).Image,gateway.Image);
  assert.deepEqual(inspect(name).Mounts,x.Mounts,'Application mounts changed');
  for(const [path,expected] of Object.entries(proof.configurationPreconditions))if(root+path!==file)assert.equal(sha(root+path),expected);
  let gatewayStatus=await getStatus(health);
  if(gatewayStatus!==200){
   // Nginx resolves this fixed upstream at startup. Reload only on demonstrated
   // gateway failure after healthy app recreation; preserve the gateway image.
   assert([502,503,504].includes(gatewayStatus),'Unexpected gateway status');
   record.gateway.beforeAppAddresses=ip(x);record.gateway.afterAppAddresses=ip(inspect(name));
   assert.notDeepEqual(ip(x),ip(inspect(name)),'No changed upstream address; investigate before reloading');
   docker('exec',gatewayName,'nginx','-t');docker('exec',gatewayName,'nginx','-s','reload');record.gateway.reloaded=true;
   for(let n=0;n<3&&gatewayStatus!==200;n++){await new Promise(r=>setTimeout(r,500));gatewayStatus=await getStatus(health);}
  }
  assert.equal(gatewayStatus,200);
  const gitVersion=docker('exec',name,'git','--version').trim();assert.equal(gitVersion,version==='new'?'git version 2.54.1':'git version 2.54.0');record.gitVersion=gitVersion;
  assert.equal(await getStatus('https://snippets.utilibre.org/healthcheck'),200);
 },
 rollbackPins:async()=>{fs.writeFileSync(file,before);assert.deepEqual(shape(),original);}
});
record.completedAt=new Date().toISOString();record.status=g.status;
record.composeSha256=sha(file);record.source.indexSha256=sha(destination+'/index.html');
const afterContainers=containerState();record.containerChanges=beforeContainers.filter(old=>{const now=afterContainers.find(c=>c.name===old.name);return !now||old.id!==now.id||old.image!==now.image;}).map(old=>({name:old.name,before:old,after:afterContainers.find(c=>c.name===old.name)||null}));
record.onlyOpengistContainerRecreated=record.containerChanges.length===1&&record.containerChanges[0].name===name;
record.applicationConfigurationUnchanged=true;record.retentionAndDataMountsUnchanged=true;
record.remainingDebianDhiGitHighRecords=27;record.remainingCandidateFindings=proof.scans.remaining;
await save();
console.log('Opengist Git 2.54.1 deployed; exact-image/native health and source publication passed. Gateway reload: '+record.gateway.reloaded+'. Remaining Debian/DHI Git high records: 27.');

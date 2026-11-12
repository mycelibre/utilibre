// Explicit stateful upgrade. Never run the old image against a migrated database.
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
const root='/var/lib/utilibre-maintenance/vikunja-upgrade-20261112';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(fileURLToPath(new URL('./recipe.json',import.meta.url)));
const approval=read(fileURLToPath(new URL('./activation-approval.json',import.meta.url)));
assert.equal(approval.projectTrashDays,30);assert.equal(approval.version,spec.input.version);
assert.equal(approval.state,'owner-approved');assert.equal(approval.image,spec.implementation.imageId);
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bounded release command failed; private output withheld: '+p);}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
for(const proof of Object.values(spec.verification)){assert.equal(sha(proof.path),proof.sha256);assert(read(proof.path).passed);}
for(const [p,h] of Object.entries({...spec.preservedConfiguration,...spec.checkFiles}))assert.equal(sha(repo+p),h);
assert.equal(sha(spec.input.archive),spec.input.archiveSha256);
const beforeScan=read(root+'/current-before-scan.json'),afterScan=read(root+'/current-runtime-scan.json');
assert.equal(afterScan.Metadata.ImageID,spec.implementation.imageId);
assert(afterScan.Results.some(r=>r.Packages?.length));
const findings=r=>r.Results.flatMap(x=>(x.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName,version:v.InstalledVersion,severity:v.Severity})));
const beforeFindings=findings(beforeScan),afterFindings=findings(afterScan);
assert(afterFindings.every(v=>beforeFindings.some(p=>JSON.stringify(v)===JSON.stringify(p))),'New finding needs separate review');
assert(!afterFindings.some(v=>['CRITICAL','HIGH'].includes(v.severity)));
assert(Date.now()-Date.parse(afterScan.CreatedAt)<86400000);
const db=read('/var/cache/utilibre-security/db/metadata.json');assert(Date.now()-Date.parse(db.UpdatedAt)<48*3600000);
const free=fs.statfsSync('/');assert(free.bavail*free.bsize>=8*1024**3);
const name='utilibre-vikunja-vikunja-1',gatewayName='utilibre-vikunja-gateway-1';
const x=inspect(name),gateway=inspect(gatewayName);assert.equal(x.Image,spec.implementation.previousImage);
assert.equal(inspect(spec.implementation.image).Id,spec.implementation.imageId);assert.equal(x.State.Health.Status,'healthy');
const file=repo+'deployment/community/compose.vikunja.yaml',before=fs.readFileSync(file,'utf8');
const labels=x.Config.Labels,g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name,service:'vikunja',oldImage:x.Image,newImage:spec.implementation.imageId,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
assert.equal(g.project,'utilibre-vikunja');assert.deepEqual(g.files,[file]);
const change=replaceImagePins(before,[{from:x.Config.Image,to:spec.implementation.image}]);assert.equal(change.replaced,1);
const shape=()=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
const original=shape(),expected=structuredClone(original);expected.services.vikunja.image=spec.implementation.image;
const sourceName='vikunja-2.8.0-upstream.tar.gz',destination='/opt/utilibre/toolbox-public';
assert(fs.readFileSync(repo+'deployment/toolbox/source-index.html','utf8').includes('href="'+sourceName+'"'));
if(process.argv[2]==='--check'){console.log('Vikunja owner approval, exact image, migration/rollback evidence, unchanged privacy config and fresh scan gates passed.');process.exit(0);}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);
assert(!fs.existsSync(root+'/release.json'),'Do not overwrite release evidence');
const record={startedAt:new Date().toISOString(),scope:'Vikunja 2.8.0 only',groups:[g],ownerApprovedProjectTrashDays:30,remainingFindings:afterFindings,advisoryUpdatedAt:db.UpdatedAt,source:{name:sourceName,sha256:spec.input.archiveSha256},backup:{},checks:[],gatewayReloaded:false};
const save=()=>fs.writeFileSync(root+'/release.json',JSON.stringify(record,null,2)+'\n');
async function checkApi(version){
 const response=await fetch('https://tasks.utilibre.org/api/v2/info',{signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200);const info=await response.json();assert.equal(info.version,version==='new'?'v2.8.0':'v2.7.0');
 assert.equal(info.auth.local.registration_enabled,false);assert.equal(info.auth.local.enabled,false);assert.equal(info.auth.openid_connect.enabled,true);
 record.checks.push({date:new Date().toISOString(),version:info.version,registrationClosed:true,nativeOidcEnabled:true});
}
await checkApi('old');
const data='/opt/utilibre/community-data/vikunja',snapshot=root+'/before-data',failed=root+'/failed-upgrade-data';
assert(!fs.existsSync(snapshot)&&!fs.existsSync(failed));
let snapshotReady=false,migrationStarted=false;
await releaseGroup(g,{
 save,
 preflight:async()=>{
  assert.equal(inspect(name).Id,x.Id);assert.equal(fs.readFileSync(file,'utf8'),before);
  const target=destination+'/'+sourceName;
  if(fs.existsSync(target))assert.equal(sha(target),spec.input.archiveSha256);
  else{const stage=fs.mkdtempSync('/opt/utilibre/vikunja-source-update-');fs.copyFileSync(spec.input.archive,stage+'/'+sourceName);assert.equal(sha(stage+'/'+sourceName),spec.input.archiveSha256);fs.chmodSync(stage+'/'+sourceName,0o644);fs.renameSync(stage+'/'+sourceName,target);}
  record.source.previousIndex=publishSourceIndex(destination);
  const r=await fetch('https://tools.utilibre.org/utilibre-source/'+sourceName,{method:'HEAD',signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);record.source.published=true;
  fs.writeFileSync(root+'/compose.before.yaml',before);
 },
 recreate:async()=>{
  if(!g.rollback){
   docker('stop','--time','30',name);
   // The existing native dump command, kept paused through activation.
   const dumpName='deployment-native-backup-20261112.zip',dump=data+'/'+dumpName;assert(!fs.existsSync(dump));
   docker(...existingComposeArgs(g),'run','--rm','--no-deps','-T','vikunja','dump','--path','/data','--filename',dumpName);
   fs.renameSync(dump,root+'/native-dump.zip');fs.chmodSync(root+'/native-dump.zip',0o600);
   run('cp',['-a','--reflink=auto',data,snapshot]);snapshotReady=true;
   run('python3',['-c',"import sqlite3,zipfile;from pathlib import Path;p=Path('"+root+"');c=sqlite3.connect('file:'+str(p/'before-data/vikunja.db')+'?mode=ro',uri=True);assert c.execute('PRAGMA integrity_check').fetchone()[0]=='ok';z=zipfile.ZipFile(p/'native-dump.zip');assert z.testzip() is None"]);
   record.backup={nativeDump:root+'/native-dump.zip',sha256:sha(root+'/native-dump.zip'),coldDirectory:snapshot,sqliteIntegrity:true,archiveIntegrity:true};save();
   fs.writeFileSync(file,change.text);assert.deepEqual(shape(),expected);migrationStarted=true;
  }
  await recreateExistingGroup(g);
 },
 gate:async version=>{
  await checkExistingGroup(g,version);assert.equal(inspect(gatewayName).Id,gateway.Id);assert.deepEqual(inspect(name).Mounts,x.Mounts);
  for(const [p,h] of Object.entries(spec.preservedConfiguration))assert.equal(sha(repo+p),h);
  // This gateway resolves a fixed address at startup; reload its unchanged config.
  docker('exec',gatewayName,'nginx','-t');docker('exec',gatewayName,'nginx','-s','reload');record.gatewayReloaded=true;
  await checkApi(version);
 },
 rollbackPins:async()=>{
  docker('stop','--time','30',name);
  if(migrationStarted){assert(snapshotReady);fs.renameSync(data,failed);run('cp',['-a','--reflink=auto',snapshot,data]);record.backup.failedCandidateDataPreserved=failed;}
  fs.writeFileSync(file,before);assert.deepEqual(shape(),original);
 }
});
record.completedAt=new Date().toISOString();record.status=g.status;record.composeSha256=sha(file);record.productionAccountWorkflow='pending separate approved synthetic-account check';save();
console.log('Vikunja 2.8.0 activated; pre-upgrade native/cold backups, exact image, privacy configuration and public API passed.');

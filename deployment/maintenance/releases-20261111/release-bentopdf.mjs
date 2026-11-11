// Exact, stateless BentoPDF release; uses the existing scoped transaction helper.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {checkExistingGroup,recreateExistingGroup,releaseGroup} from '../language-final/release.mjs';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const state='/var/lib/utilibre-maintenance/releases-20261111';
const config=root+'deployment/toolbox/compose.yaml';
const source=state+'/bentopdf';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const command=(args,options={})=>execFileSync(args[0],args.slice(1),{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...options});
const inspect=name=>JSON.parse(command(['docker','inspect',name]))[0];
const recipe=json(new URL('./bentopdf-release.json',import.meta.url));
const mode=process.argv[2];assert(['--prepare','--apply','--rollback'].includes(mode));
assert.equal(recipe.schemaVersion,1);assert.equal(recipe.approved,true);
assert.equal(recipe.sourceRevision,'f638f8e4db66cb69dec35ca061ad89034dd62445');
assert.equal(recipe.base,'sha256:2c135f176fb9abd3a0ae4392cf3c9e846d4e3e3d9c49e8ff52e9c2dc22c46ee9');
assert.equal(recipe.candidate,'utilibre-toolbox-bentopdf:2.8.11-p1');
assert(/^sha256:[a-f0-9]{64}$/.test(recipe.imageId));
assert.equal(inspect(recipe.candidate).Id,recipe.imageId);
assert.equal(hash(readFileSync(source+'/package-lock.json')),recipe.lockSha256);
for(const [path,digest]of Object.entries(recipe.integrationHashes)){
 assert(/^(?:deployment|portal|scripts)\/[a-zA-Z0-9_./-]+$/.test(path)&&!path.split('/').includes('..'));
 assert.equal(hash(readFileSync(root+path)),digest,'Integration changed: '+path);
}
for(const [name,digest]of Object.entries(recipe.evidence)){
 assert(/^[a-z0-9-]+\.json$/.test(name));
 assert.equal(hash(readFileSync(state+'/'+name)),digest,'Review evidence changed: '+name);
}
const native=json(state+'/candidate-workflows.json');
assert.equal(native.result,'passed');assert.equal(native.mode,'isolated-candidate-local-dns');
assert.equal(native.testArtifact,recipe.imageId);
assert.deepEqual(native.externalAssetOrigins,[]);assert.deepEqual(native.unexpectedWrites,[]);
assert.equal(json(state+'/runtime-equivalence.json').candidate,recipe.imageId);
assert(json(state+'/runtime-equivalence.json').passed);
const security=json(state+'/security-gate.json');
assert(security.passed&&security.runtimeFindingsUnchanged);
assert.equal(security.candidate,recipe.imageId);assert.equal(security.base,recipe.base);
assert.equal(security.sourceCriticalHigh,0);
assert(![...security.runtimeFindings,...security.sourceFindings].some(v=>['HIGH','CRITICAL'].includes(v[3])));
for(const [name,digest]of Object.entries(security.evidence)){
 assert(/^[a-z0-9-]+\.json$/.test(name));assert.equal(hash(readFileSync(state+'/'+name)),digest);
}
if(mode!=='--rollback')assert(Date.now()-Date.parse(security.database.metadata.UpdatedAt)<recipe.maximumDatabaseAgeHours*3600000,'Refresh assessment deliberately before release');
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
try{
 if(mode==='--prepare'){
  assert(!existsSync(state+'/release.json'),'Review an existing release journal instead of replacing it');
  const old=readFileSync(config,'utf8'),live=inspect('utilibre-toolbox-bentopdf-1');
  assert.equal(live.Image,recipe.base);assert.equal(live.Config.Image,'utilibre-toolbox-bentopdf:musl-security-20261109');
  assert.equal(old.split('image: utilibre-toolbox-bentopdf:musl-security-20261109').length,2);
  assert.equal(old.split('/opt/utilibre/pack-static/bentopdf-2.8.8-p4').length,2);
  const next=old.replace('image: utilibre-toolbox-bentopdf:musl-security-20261109','image: '+recipe.candidate).replace('/opt/utilibre/pack-static/bentopdf-2.8.8-p4','/opt/utilibre/pack-static/bentopdf-2.8.11-p1');
  writeFileSync(state+'/compose-before.yaml',old,{mode:0o600});writeFileSync(state+'/compose-after.yaml',next,{mode:0o600});
  const journal={date:new Date().toISOString(),oldHash:hash(old),newHash:hash(next),group:{project:'utilibre-toolbox',cwd:live.Config.Labels['com.docker.compose.project.working_dir'],files:[config],before:[],status:'prepared',rows:[{name:'utilibre-toolbox-bentopdf-1',service:'bentopdf',oldRef:live.Config.Image,oldImage:recipe.base,newRef:recipe.candidate,newImage:recipe.imageId,oldContainerId:live.Id,oldRestartCount:live.RestartCount}]}};
  assert.equal(live.Config.Labels['com.docker.compose.project.config_files'],config);
  writeFileSync(state+'/release.json',JSON.stringify(journal,null,2)+'\n',{mode:0o600});
  console.log('Prepared exact one-service release; no live changes.');
 }else{
  const j=json(state+'/release.json'),save=()=>writeFileSync(state+'/release.json',JSON.stringify(j,null,2)+'\n',{mode:0o600});
  assert.equal(j.group.rows.length,1);assert.equal(j.group.rows[0].newImage,recipe.imageId);
  assert.deepEqual(j.group.files,[config]);assert.equal(j.group.project,'utilibre-toolbox');
  const pin=which=>{const before=readFileSync(config);assert([j.oldHash,j.newHash].includes(hash(before)),'Unrelated Compose change');const text=readFileSync(state+`/compose-${which==='new'?'after':'before'}.yaml`);assert.equal(hash(text),which==='new'?j.newHash:j.oldHash);writeFileSync(config,text);};
  if(mode==='--rollback'){
   assert.equal(inspect(j.group.rows[0].name).Image,recipe.imageId);pin('old');await recreateExistingGroup(j.group);await checkExistingGroup(j.group,'old');j.group.rollback='verified';await save();console.log('Previous image restored; no user data changed.');
  }else if(j.group.status==='passed'){
   assert.equal(inspect(j.group.rows[0].name).Image,recipe.imageId);assert.equal(hash(readFileSync(config)),j.newHash);console.log('Already deployed; no restart.');
  }else{
   assert.equal(j.group.status,'prepared');
   await releaseGroup(j.group,{
    preflight:async()=>{assert.equal(inspect(j.group.rows[0].name).Image,recipe.base);assert.equal(hash(readFileSync(config)),j.oldHash);pin('new');},
    save,recreate:()=>recreateExistingGroup(j.group),rollbackPins:async()=>pin('old'),
    gate:async which=>{await checkExistingGroup(j.group,which);if(which==='new'){
     let report;try{report=command(['node','deployment/toolbox/check-pdf-tools.mjs'],{timeout:300000,env:{...process.env,BENTO_TEST_SOURCE:source}});}catch(error){
      writeFileSync(state+'/public-workflows-failure.log',String(error.stdout||'')+'\n'+String(error.stderr||''),{mode:0o600});throw Error('Public workflow failed; private evidence retained');
     }
     writeFileSync(state+'/public-workflows.json',report,{mode:0o600});assert.equal(JSON.parse(report).result,'passed');
    }},
   });console.log('BentoPDF deployed and public workflows passed.');
  }
 }
}finally{unlock();}

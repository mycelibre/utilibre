#!/usr/bin/env node
// Guarded promotion of reviewed Redlib artifacts; never invent or rebase a fix.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,renameSync,mkdirSync,mkdtempSync,rmSync,statSync,lstatSync,chownSync,statfsSync,openSync,closeSync,copyFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {checkExistingGroup,recreateExistingGroup,releaseGroup} from '../deployment/maintenance/language-final/release.mjs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const STATE='/var/lib/utilibre-maintenance/redlib-update';
const NAME='public-utility-redlib-1',SOURCE='/opt/utilibre/toolbox-public';
const SCANNER='/opt/utilibre/maintenance/bin/trivy',DB='/var/cache/utilibre-security/db';
const REV=/^[a-f0-9]{40}$/,HASH=/^[a-f0-9]{64}$/,ID=/^sha256:[a-f0-9]{64}$/;
const REF=/^utilibre-redlib:[a-zA-Z0-9_.-]+$/;
export const sha=value=>createHash('sha256').update(value).digest('hex');
const json=file=>JSON.parse(readFileSync(file,'utf8'));
export function atomic(file,value){
 const temporary=file+'.'+randomUUID()+'.tmp';
 try{writeFileSync(temporary,value,{mode:0o600,flag:'wx'});renameSync(temporary,file);}finally{rmSync(temporary,{force:true});}
}
const save=(file,value)=>atomic(file,JSON.stringify(value,null,2)+'\n');
export function command(args,{cwd=ROOT,timeout=120000,log}={}){
 let fd;
 try{if(log)fd=openSync(log,'w',0o600);return execFileSync(args[0],args.slice(1),{
  cwd,timeout,maxBuffer:16*1024**2,encoding:'utf8',stdio:log?['ignore',fd,fd]:['ignore','pipe','pipe'],
 });}catch{throw Error(`${args[0]} operation failed or timed out${log?'; private log retained':''}`);}
 finally{if(fd!==undefined)closeSync(fd);}
}
const docker=(...args)=>command(['docker',...args]);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const compose=(...args)=>docker('compose','--project-directory',ROOT,'-p','public-utility','-f',ROOT+'/compose.yaml',...args);
const configuration=()=>JSON.parse(compose('config','--format','json')).services;
export function validateApproval(recipe,policy,recipeBytes,readPatch){
 assert.equal(policy.schemaVersion,1);assert.equal(policy.approval,'reviewed');
 assert.equal(recipe.automaticDeployment,true,'Recipe is not approved for scheduled activation');
 assert.equal(sha(recipeBytes),policy.recipeSha256,'Recipe changed; renewed approval required');
 assert.equal(recipe.source.origin,'https://github.com/polak14/redlib');assert(REV.test(recipe.source.revision));
 assert.equal(recipe.source.archive,`https://codeload.github.com/polak14/redlib/tar.gz/${recipe.source.revision}`);
 assert(HASH.test(recipe.source.sha256));assert.deepEqual(recipe.deploymentScope,['redlib']);assert.equal(recipe.migration,'none; stateless application');
 for(const item of [recipe.runtime,recipe.candidate]){assert(REF.test(item.reference));assert(ID.test(item.imageId));}
 assert(HASH.test(recipe.candidate.binarySha256));assert(ID.test(recipe.candidate.buildToolchainImageId));
 assert(recipe.patches.length>0&&recipe.patches.length<=20);
 for(const patch of recipe.patches){assert(/^patches\/[a-zA-Z0-9_.-]+\.patch$/.test(patch.path));assert.equal(sha(readPatch(patch.path)),patch.sha256,'Patch changed; review required');}
 assert(/^redlib-[a-f0-9]{7,40}-utilibre-[1-9][0-9]*-source(?:-v[0-9]+)?\.tar\.gz$/.test(policy.sourceOffer.name));assert(HASH.test(policy.sourceOffer.sha256));
 assert.equal(policy.security.scannerVersion,'0.75.0');assert(HASH.test(policy.security.scannerSha256));assert(HASH.test(policy.security.findingsSha256));
 assert(Number.isInteger(policy.security.maxDatabaseAgeHours)&&policy.security.maxDatabaseAgeHours>0&&policy.security.maxDatabaseAgeHours<=48);
 for(const n of [policy.security.runtimePackages,policy.security.cargoPackages,...policy.testCounts])assert(Number.isInteger(n)&&n>0);
 assert.equal(policy.testCounts.length,5);
}
export function decide(head,live,recipe){
 assert(REV.test(head),'Malformed upstream revision');
 assert([recipe.runtime.imageId,recipe.candidate.imageId].includes(live),'Unreviewed live image; preserve local repairs');
 if(head!==recipe.source.revision)return 'review-required';
 return live===recipe.candidate.imageId?'up-to-date':'approved-update';
}
export function normalizedFindings(reports){
 return reports.flatMap(report=>{
  assert(Array.isArray(report.Results)&&report.Results.length,'Missing scanner coverage');
  return report.Results.flatMap(result=>{
   assert(Array.isArray(result.Packages)&&result.Packages.length,'Missing extracted package inventory');
   assert(result.Vulnerabilities===undefined||Array.isArray(result.Vulnerabilities),'Malformed findings');
   return (result.Vulnerabilities||[]).map(v=>{
    for(const key of ['VulnerabilityID','PkgName','InstalledVersion','Severity'])assert(typeof v[key]==='string'&&v[key]);
    return [result.Class,result.Type,v.VulnerabilityID,v.PkgName,v.InstalledVersion,v.FixedVersion||'',v.Severity,v.Status||'',v.LastModifiedDate||''];
   });
  });
 }).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
export function checkScans(runtime,cargo,policy,metadata,now=Date.now()){
 const date=Date.parse(metadata.UpdatedAt);assert(Number.isFinite(date)&&date<=now+300000&&now-date<=policy.maxDatabaseAgeHours*3600000,'Security database is stale or invalid');
 const count=r=>r.Results.reduce((n,x)=>n+x.Packages.length,0);
 const found=normalizedFindings([runtime,cargo]);
 assert.equal(count(runtime),policy.runtimePackages,'Runtime extraction coverage changed');assert.equal(count(cargo),policy.cargoPackages,'Cargo extraction coverage changed');
 assert.equal(sha(JSON.stringify(found)),policy.findingsSha256,'New or changed vulnerability findings need review');
 return {runtimePackages:count(runtime),cargoPackages:count(cargo),findings:found.length,databaseUpdatedAt:metadata.UpdatedAt};
}
const KEYS=['REDLIB_IMAGE','REDLIB_BANNER'];
export function selectedLines(text){
 const values={};for(const key of KEYS){const lines=text.split('\n').filter(l=>new RegExp(`^(?:export\\s+)?${key}\\s*=`).test(l));assert(lines.length<=1,'Duplicate Redlib environment setting');values[key]=lines[0]??null;}return values;
}
export function replaceLines(text,values){
 selectedLines(text);const remaining=new Set(KEYS);const lines=[];
 for(const line of text.split('\n')){
  const key=KEYS.find(k=>new RegExp(`^(?:export\\s+)?${k}\\s*=`).test(line));
  if(!key){lines.push(line);continue;}
  remaining.delete(key);if(values[key]!==null)lines.push(values[key]);
 }
 for(const key of KEYS){const value=values[key];assert(value===null||typeof value==='string'&&!/[\r\n]/.test(value)&&value.startsWith(key+'='));}
 if(lines.at(-1)==='')lines.pop();
 for(const key of remaining)if(values[key]!==null)lines.push(values[key]);
 return lines.join('\n')+'\n';
}
function pinValues(reference,banner){assert(REF.test(reference));assert(!/[\r\n']/.test(banner));return {REDLIB_IMAGE:'REDLIB_IMAGE='+reference,REDLIB_BANNER:"REDLIB_BANNER='"+banner+"'"};}
function editEnv(expected,next){
 const file=ROOT+'/.env',stat=lstatSync(file,{throwIfNoEntry:true});assert(!stat.isSymbolicLink()&&stat.isFile()&&(stat.mode&0o077)===0,'Private regular .env required');
 const before=readFileSync(file,'utf8');assert.equal(sha(before),expected,'Concurrent environment change; refusing overwrite');const temporary=file+'.redlib-'+randomUUID();
 try{writeFileSync(temporary,next,{mode:stat.mode&0o777,flag:'wx'});chownSync(temporary,stat.uid,stat.gid);assert.equal(sha(readFileSync(file)),expected,'Concurrent environment change');renameSync(temporary,file);}finally{rmSync(temporary,{force:true});}
}
function serviceHash(row){const copy=structuredClone(row);delete copy.image;delete copy.environment.REDLIB_BANNER;return sha(JSON.stringify(copy));}
export function validateRuntimeDiff(changes,init,containerHash,hostHash){
 const rows=changes.trim().split('\n').filter(Boolean);
 if(!rows.length)return;
 assert.equal(init,true,'Unreviewed runtime edits');
 assert.deepEqual([...rows].sort(),['C /usr','C /usr/sbin','A /usr/sbin/docker-init'].sort(),'Unexpected live filesystem edits');
 assert(HASH.test(containerHash)&&containerHash===hostHash,'Docker native init differs from installed host binary');
}
function current(){
 const config=configuration(),live=inspect(NAME);assert.equal(config.redlib.image,live.Config.Image,'Configured/live image mismatch');
 assert.equal(inspect(config.redlib.image).Id,live.Image,'Live image tag drift');assert(live.State.Running);assert(live.HostConfig.ReadonlyRootfs);assert.equal(live.Mounts.length,0);const changes=docker('diff',NAME);
 const initHash=changes.trim()?docker('exec',NAME,'sha256sum','/usr/sbin/docker-init').split(/\s/)[0]:'';
 validateRuntimeDiff(changes,live.HostConfig.Init,initHash,changes.trim()?sha(readFileSync('/usr/libexec/docker/docker-init')):'');
 assert.deepEqual(live.HostConfig.PortBindings,{});return {config,live};
}
async function upstream(){
 // Exactly one bounded public GitHub request, without credentials or redirects.
 const response=await fetch('https://api.github.com/repos/polak14/redlib/commits?per_page=1',{redirect:'error',signal:AbortSignal.timeout(25000),headers:{Accept:'application/vnd.github+json','User-Agent':'Utilibre-Redlib-maintenance'}});
 assert.equal(response.status,200,'Upstream revision lookup failed');const bytes=await readBounded(response,1024*1024);const data=JSON.parse(bytes);assert(Array.isArray(data)&&data.length===1&&REV.test(data[0]?.sha),'Invalid upstream response');return data[0].sha;
}
async function readBounded(response,max){let out='';for await(const chunk of response.body){out+=Buffer.from(chunk).toString();assert(Buffer.byteLength(out)<=max,'Response exceeded limit');}return out;}
function origin(live){const networks=Object.values(live.NetworkSettings.Networks);assert.equal(networks.length,1);const ip=networks[0].IPAddress;assert(/^\d+\.\d+\.\d+\.\d+$/.test(ip));return `http://${ip}:8080/`;}
function workflow(base,file){command([process.execPath,ROOT+'/config/redlib/check-instance.mjs',base,file],{timeout:360000,log:file+'.log'});const report=json(file);assert.equal(report.passed,true,'Native browsing failed');return report;}
async function sourceAvailable(policy){
 const response=await fetch('https://tools.utilibre.org/utilibre-source/'+policy.sourceOffer.name,{method:'HEAD',redirect:'error',signal:AbortSignal.timeout(25000)});
 assert.equal(response.status,200,'Matching source not publicly accessible');assert.equal(Number(response.headers.get('content-length')),statSync(join(SOURCE,policy.sourceOffer.name)).size);
}
function removeOwned(name,token){
 assert(/^utilibre-redlib-(build|check)-[a-f0-9-]{36}$/.test(name));
 if(!docker('ps','-aq','--filter','name=^/'+name+'$').trim())return;
 assert.equal(inspect(name).Config.Labels?.['org.utilibre.redlib-maintenance'],token,'Unowned candidate container');docker('rm','-f',name);
}
function cleanupStage(){
 const file=STATE+'/stage-pending.json';if(!existsSync(file))return;
 const record=json(file);assert(/^\/var\/lib\/utilibre-maintenance\/redlib-update\/run-[a-zA-Z0-9]{6}$/.test(record.run));
 removeOwned(record.builder,record.token);removeOwned(record.preview,record.token);rmSync(record.run+'/work',{recursive:true,force:true});rmSync(file);
}
export async function stage(recipe,policy,run){
 const disk=statfsSync(STATE);assert(disk.bavail*disk.bsize>=10*1024**3,'10 GiB free disk required');
 const candidate=inspect(recipe.candidate.reference),base=inspect(recipe.runtime.reference);
 assert.equal(candidate.Id,recipe.candidate.imageId);assert.equal(base.Id,recipe.runtime.imageId);
 assert.deepEqual(candidate.RootFS.Layers.slice(0,-1),base.RootFS.Layers,'Predecessor repair layers changed');
 const plain=i=>{const c=structuredClone(i.Config);delete c.Labels;return c;};assert.deepEqual(plain(candidate),plain(base),'Runtime settings changed');
 assert.equal(candidate.Config.Labels['org.opencontainers.image.revision'],recipe.source.revision);
 assert.equal(inspect(recipe.candidate.buildToolchainImageId).Id,recipe.candidate.buildToolchainImageId);
 const binary=docker('run','--rm','--pull','never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint','sha256sum',recipe.candidate.imageId,'/usr/local/bin/redlib').split(/\s/)[0];assert.equal(binary,recipe.candidate.binarySha256);
 const bundle=join(SOURCE,policy.sourceOffer.name);assert.equal(sha(readFileSync(bundle)),policy.sourceOffer.sha256,'Matching-source archive changed');
 const work=join(run,'work');mkdirSync(work,{mode:0o700});const token=randomUUID(),builder='utilibre-redlib-build-'+token,preview='utilibre-redlib-check-'+token;
 save(STATE+'/stage-pending.json',{run,token,builder,preview});
 try{
  command(['tar','--no-same-owner','-xzf',bundle,'-C',work],{timeout:60000});
  command([process.execPath,ROOT+'/config/redlib/prepare-source.mjs',work+'/upstream.tar.gz',work+'/replay'],{log:run+'/replay.log'});
  for(const [file,hash]of Object.entries(json(work+'/replay/prepared.json').tree))assert.equal(sha(readFileSync(work+'/redlib/'+file)),hash,'Source offer differs from approved replay');
  mkdirSync(work+'/target');mkdirSync(work+'/cargo');
  const suite='mkdir -p /target/tmp; export TMPDIR=/target/tmp; rustc --test build.rs -o /target/build-tests && /target/build-tests && cargo test --offline --locked --lib gql::tests && cargo test --offline --locked --lib gql_feed::tests && cargo test --offline --locked --lib redirect_tests && cargo test --offline --locked --lib utils::tests::test_format_url';
  command(['docker','run','--rm','--pull','never','--name',builder,'--label','org.utilibre.redlib-maintenance='+token,'--network','none','--cpus','2','--memory','4g','--memory-swap','4g','--pids-limit','256','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,size=64m','-v',work+'/redlib:/work:ro','-v',work+'/vendor:/vendor:ro','-v',work+'/target:/target','-v',work+'/cargo:/cargo','-e','CARGO_HOME=/cargo','-e','CARGO_TARGET_DIR=/target','-e','CARGO_BUILD_JOBS=2','-e','CARGO_PROFILE_DEV_DEBUG=0','-e','CARGO_PROFILE_TEST_DEBUG=0','-e','REDLIB_BUILD_REVISION='+recipe.source.revision,'-w','/work',recipe.candidate.buildToolchainImageId,'timeout','1200s','sh','-ec',suite],{timeout:1250000,log:run+'/tests.log'});
  const counts=[...readFileSync(run+'/tests.log','utf8').matchAll(/test result: ok\. (\d+) passed; 0 failed/g)].map(m=>Number(m[1]));assert.deepEqual(counts,policy.testCounts,'Required tests did not all run');
  const cache=work+'/scan-cache';mkdirSync(cache+'/db',{recursive:true});for(const file of ['trivy.db','metadata.json'])command(['cp','--reflink=auto',DB+'/'+file,cache+'/db/'+file]);
  const metadata=json(cache+'/db/metadata.json');assert.equal(sha(readFileSync(SCANNER)),policy.security.scannerSha256,'Scanner changed; review required');
  const lock=work+'/lock';mkdirSync(lock);copyFileSync(work+'/redlib/Cargo.lock',lock+'/Cargo.lock');
  const scan=(kind,input,out)=>command(['unshare','--net','--',SCANNER,kind,'--config','/dev/null','--ignorefile','/dev/null','--cache-dir',cache,'--scanners','vuln','--skip-db-update','--skip-java-db-update','--skip-check-update','--skip-version-check','--skip-vex-repo-update','--offline-scan','--timeout','5m','--format','json','--list-all-pkgs',...(kind==='image'?['--image-src','docker']:[]),'--output',out,input],{timeout:330000,log:out+'.log'});
  scan('image',recipe.candidate.imageId,run+'/runtime-scan.json');scan('fs',lock,run+'/cargo-scan.json');
  const security=checkScans(json(run+'/runtime-scan.json'),json(run+'/cargo-scan.json'),policy.security,metadata);security.databaseSha256=sha(readFileSync(cache+'/db/trivy.db'));save(run+'/security.json',security);
  const {config,live}=current();const network=Object.keys(live.NetworkSettings.Networks);assert.equal(network.length,1);
  const env=Object.entries(config.redlib.environment).map(([k,v])=>{assert(/^(?:REDLIB_[A-Z_]+|RUST_LOG|TZ)$/.test(k)&&!/[\r\n]/.test(String(v)));return k+'='+v;}).join('\n');writeFileSync(work+'/candidate.env',env+'\n',{mode:0o600});
  docker('run','-d','--pull','never','--name',preview,'--label','org.utilibre.redlib-maintenance='+token,'--network',network[0],'--cpus','0.5','--memory','256m','--memory-swap','256m','--pids-limit','128','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=32m','--env-file',work+'/candidate.env',recipe.candidate.imageId,...live.Config.Cmd);
  await new Promise(resolve=>setTimeout(resolve,1500));const browsing=workflow(origin(inspect(preview)),run+'/candidate-browsing.json');await sourceAvailable(policy);
  const result={passed:true,at:new Date().toISOString(),recipeSha256:policy.recipeSha256,imageId:recipe.candidate.imageId,tests:counts,security,requests:browsing.requests};save(run+'/stage.json',result);return result;
 }finally{cleanupStage();}
}
export async function activate(journal,ops){
 await releaseGroup(journal.group,{preflight:async()=>{await ops.validate();await ops.save();await ops.pin('new');},save:ops.save,recreate:ops.recreate,gate:ops.gate,rollbackPins:()=>ops.pin('old')});
}
function group(live,recipe){return {project:'public-utility',cwd:ROOT,files:[ROOT+'/compose.yaml'],before:[],status:'prepared',rows:[{name:NAME,service:'redlib',oldRef:recipe.runtime.reference,oldImage:recipe.runtime.imageId,newRef:recipe.candidate.reference,newImage:recipe.candidate.imageId,oldContainerId:live.Id,oldRestartCount:live.RestartCount}]};}
function validateConfig(j){const config=configuration();assert.deepEqual(Object.keys(config).filter(n=>n!=='redlib').sort(),Object.keys(j.otherConfigHashes).sort(),'Service inventory changed');assert.equal(serviceHash(config.redlib),j.redlibConfigHash);for(const [name,hash]of Object.entries(j.otherConfigHashes))assert.equal(sha(JSON.stringify(config[name])),hash,'Other service config changed');return config;}
function journalOps(j,run){
 const pending=STATE+'/pending.json';return {
  validate:async()=>{validateConfig(j);for(const which of ['old','new'])assert.equal(inspect(j.group.rows[0][which+'Ref']).Id,j.group.rows[0][which+'Image']);assert([j.group.rows[0].oldImage,j.group.rows[0].newImage].includes(inspect(NAME).Image),'Manual runtime change; refusing recovery');},
  save:async()=>save(pending,j),
  pin:async which=>{const text=readFileSync(ROOT+'/.env','utf8');assert([j.beforeEnvSha256,j.afterEnvSha256].includes(sha(text)),'Environment changed outside updater');const after=replaceLines(text,j[which+'Values']);editEnv(sha(text),after);validateConfig(j);},
  recreate:()=>recreateExistingGroup(j.group),
  gate:async which=>{await checkExistingGroup(j.group,which);validateConfig(j);if(which==='new')workflow(origin(inspect(NAME)),run+'/deployed-browsing.json');},
 };
}
export function validateJournal(j){
 assert.equal(j.schemaVersion,1);assert.equal(j.group.project,'public-utility');assert.equal(j.group.rows.length,1);assert.equal(j.group.rows[0].name,NAME);assert.equal(j.group.rows[0].service,'redlib');assert.deepEqual(j.group.files,[ROOT+'/compose.yaml']);assert.equal(j.group.cwd,ROOT);assert.deepEqual(j.group.before,[]);
 assert.equal(j.group.mirrorFiles,undefined);assert.equal(j.group.rows[0].namespaceParent,undefined);
 for(const which of ['old','new']){assert(REF.test(j.group.rows[0][which+'Ref']));assert(ID.test(j.group.rows[0][which+'Image']));}
 for(const key of ['beforeEnvSha256','afterEnvSha256','redlibConfigHash'])assert(HASH.test(j[key]));
 assert(j.otherConfigHashes&&typeof j.otherConfigHashes==='object'&&!Array.isArray(j.otherConfigHashes));for(const hash of Object.values(j.otherConfigHashes))assert(HASH.test(hash));
 for(const which of ['old','new']){assert.deepEqual(Object.keys(j[which+'Values']).sort(),[...KEYS].sort());replaceLines('',j[which+'Values']);}
}
async function recover(){
 const j=json(STATE+'/pending.json');validateJournal(j);
 const ops=journalOps(j,STATE);await ops.validate();await ops.pin('old');await ops.recreate();await ops.gate('old');save(STATE+'/last-recovery.json',{at:new Date().toISOString(),status:'predecessor-health-restored',image:j.group.rows[0].oldImage});rmSync(STATE+'/pending.json');
}
export async function main(args=process.argv.slice(2)){
 assert(args.length<=1&&['--check','--stage','--apply'].includes(args[0]||'--check'),'Usage: redlib-maintain.mjs [--check|--stage|--apply]');
 // flock protects every entry path, including manual invocations; descriptors
 // remain in the locked wrapper while the bounded child runs.
 if(process.env.UTILIBRE_REDLIB_LOCKED!=='1'){
  mkdirSync(STATE,{recursive:true,mode:0o700});
  try{process.stdout.write(command(['flock','-n',STATE+'/lock','env','UTILIBRE_REDLIB_LOCKED=1',process.execPath,fileURLToPath(import.meta.url),...args],{timeout:2900000}));}
  catch{console.error('Redlib maintenance stopped; inspect private reports in '+STATE);process.exitCode=1;}return;
 }
 process.umask(0o077);const mode=args[0]||'--check',reportFile=STATE+(mode==='--apply'?'/last-run.json':mode==='--stage'?'/last-stage.json':'/last-check.json'),report={date:new Date().toISOString(),mode,status:'failed'};
 try{
  if(existsSync(STATE+'/stage-pending.json')){assert.notEqual(mode,'--check','Interrupted staging requires --apply or --stage cleanup');cleanupStage();}
  if(existsSync(STATE+'/pending.json')){assert.equal(mode,'--apply','Interrupted release requires --apply recovery');await recover();report.status='recovered';save(reportFile,report);return;}
  const recipeBytes=readFileSync(ROOT+'/config/redlib/recipe.json'),recipe=JSON.parse(recipeBytes),policy=json(ROOT+'/config/redlib/update-policy.json');validateApproval(recipe,policy,recipeBytes,p=>readFileSync(ROOT+'/config/redlib/'+p));
  const {config,live}=current();report.installedImage=live.Image;report.head=await upstream();report.approvedRevision=recipe.source.revision;report.status=decide(report.head,live.Image,recipe);
  if(mode==='--check')return;
  if(mode==='--apply'&&['up-to-date','review-required'].includes(report.status)){
   const check=workflow(origin(live),STATE+'/last-browsing.json');report.browsing={passed:true,requests:check.requests};return;
  }
  assert.notEqual(report.status,'review-required','Unreviewed upstream revision; no staging or activation');
  const run=mkdtempSync(STATE+'/run-');report.run=run;await stage(recipe,policy,run);report.status='candidate-tested';
  if(mode==='--stage'||live.Image===recipe.candidate.imageId)return;
  const now=current();assert.equal(now.live.Id,live.Id,'Runtime changed during staging');assert.equal(sha(JSON.stringify(now.config)),sha(JSON.stringify(config)),'Configuration changed during staging');
  validateApproval(JSON.parse(readFileSync(ROOT+'/config/redlib/recipe.json')),json(ROOT+'/config/redlib/update-policy.json'),readFileSync(ROOT+'/config/redlib/recipe.json'),p=>readFileSync(ROOT+'/config/redlib/'+p));
  assert.equal(sha(readFileSync(ROOT+'/config/redlib/recipe.json')),policy.recipeSha256,'Approval changed during staging');
  const before=readFileSync(ROOT+'/.env','utf8');assert(before.endsWith('\n'),'Environment needs a final newline before automated activation');const banner=config.redlib.environment.REDLIB_BANNER;assert.equal((banner.match(/https:\/\/tools\.utilibre\.org\/utilibre-source\/redlib-[a-zA-Z0-9.-]+\.tar\.gz/g)||[]).length,1);
  const updatedBanner=banner.replace(/https:\/\/tools\.utilibre\.org\/utilibre-source\/redlib-[a-zA-Z0-9.-]+\.tar\.gz/,'https://tools.utilibre.org/utilibre-source/'+policy.sourceOffer.name);
  const oldValues=selectedLines(before),newValues=pinValues(recipe.candidate.reference,updatedBanner),after=replaceLines(before,newValues);
  const j={schemaVersion:1,group:group(live,recipe),oldValues,newValues,beforeEnvSha256:sha(before),afterEnvSha256:sha(after),redlibConfigHash:serviceHash(config.redlib),otherConfigHashes:Object.fromEntries(Object.entries(config).filter(([n])=>n!=='redlib').map(([n,c])=>[n,sha(JSON.stringify(c))]))};
  try{await activate(j,journalOps(j,run));report.status='updated';}
  finally{if(j.group.status==='passed'||j.group.rollback==='verified')rmSync(STATE+'/pending.json',{force:true});save(run+'/release.json',j);}
 }catch(error){report.status='failed';report.error=String(error).slice(0,500);process.exitCode=1;}
 finally{report.completedAt=new Date().toISOString();save(reportFile,report);console.log(JSON.stringify({status:report.status,report:reportFile}));}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();

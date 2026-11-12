// Content-only candidate check/release using the existing scoped release driver.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../../language-final/release.mjs';
import {acquireReleaseLock} from '../../security-20261103/release-lock.mjs';
process.umask(0o077);assert.equal(process.argv.length,3);assert(['--check','--apply'].includes(process.argv[2]));
const root='/var/lib/utilibre-maintenance/vikunja-upgrade-20261112',repo='/home/ubuntu/freetools';
const old='sha256:66dd5e3669b384332c49790fed7a74ab253540bb34b18790cc4e5d57210dbdb6',ref='utilibre-portal:vikunja-retention-20261112';
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']});}catch{throw Error('Bounded command failed; output withheld: '+p);}};
const docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0],read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const candidate=inspect(ref),live=inspect('public-utility-portal-1');assert.equal(live.Image,old);
assert.deepEqual(candidate.Config,inspect(old).Config,'Runtime configuration changed');
assert.equal(read(root+'/release.json').status,'passed');assert.equal(read(root+'/live-workflow.json').passed,true);
const files=['src/catalog/account-additions.ts','src/catalog/upstreams.ts','src/catalog/guidance.ts','src/pages/account-addition-guides.ts'];
for(const file of files)assert.equal(sha(repo+'/portal/'+file),sha(root+'/portal-source/portal/'+file));
assert(fs.readFileSync(root+'/portal-tests-isolated.log','utf8').includes('125'));
const name='maintenance-vikunja-portal-20261112';
const publicKeys=new Set(['ENABLED_SERVICES','LISTED_SERVICES','DEFAULT_LANGUAGE','PROJECT_NAME','PRIVATE_PREVIEW','SUPPORT_URL','CONTACT_URL','SOURCE_CODE_URL']);
const env=live.Config.Env.filter(e=>e.startsWith('PUBLIC_')||publicKeys.has(e.split('=')[0]));
if(process.argv[2]==='--check'){
 try{
  docker('run','-d','--name',name,'--pull','never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','64','--log-driver','none',...env.flatMap(e=>['-e',e]),candidate.Id);
  const pid=String(inspect(name).State.Pid);
  run('nsenter',['-t',pid,'-n','/root/.nvm/versions/node/v24.22.3/bin/node',repo+'/deployment/maintenance/releases-20261112/vikunja/check-portal.mjs']);
  const apk=docker('exec',name,'cat','/lib/apk/db/installed');assert.equal(apk,docker('exec','public-utility-portal-1','cat','/lib/apk/db/installed'));
  assert.equal(docker('exec',name,'sha256sum','/usr/local/bin/node'),docker('exec','public-utility-portal-1','sha256sum','/usr/local/bin/node'));
  fs.writeFileSync(root+'/portal-candidate.json',JSON.stringify({passed:true,date:new Date().toISOString(),old,image:candidate.Id,ref,unchangedRuntime:true,browserSha256:sha(root+'/portal-browser.json'),files:Object.fromEntries(files.map(f=>[f,sha(repo+'/portal/'+f)]))},null,2)+'\n');
 }finally{docker('rm','-f',name);}
 console.log('Content-only portal candidate passed four bilingual desktop/mobile journeys; runtime unchanged.');process.exit(0);
}
const proof=read(root+'/portal-candidate.json');assert(proof.passed&&proof.unchangedRuntime);assert.equal(proof.image,candidate.Id);assert.equal(sha(root+'/portal-browser.json'),proof.browserSha256);
for(const [f,h]of Object.entries(proof.files))assert.equal(sha(repo+'/portal/'+f),h);
assert(Date.now()-Date.parse(proof.date)<86400000);
const scan=read(root+'/portal-scan.json');assert.equal(scan.Metadata.ImageID,candidate.Id);assert(scan.Results.some(r=>r.Packages?.length));assert(!scan.Results.some(r=>(r.Vulnerabilities||[]).some(v=>['HIGH','CRITICAL'].includes(v.Severity))));
assert(Date.now()-Date.parse(read('/var/cache/utilibre-security/db/metadata.json').UpdatedAt)<48*3600000);
const l=live.Config.Labels,g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name:live.Name.slice(1),service:'portal',oldImage:old,newImage:candidate.Id,oldContainerId:live.Id,oldRestartCount:live.RestartCount}]};
const file=repo+'/.env',before=fs.readFileSync(file,'utf8'),line=before.match(/^PORTAL_IMAGE=.*$/m)?.[0];assert(line);assert.equal(inspect(line.slice(13)).Id,old);
const next=before.replace(line,'PORTAL_IMAGE='+ref),shape=()=>{const s=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services.portal;delete s.image;return s;},original=shape();
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);assert(!fs.existsSync(root+'/portal-release.json'));
const record={startedAt:new Date().toISOString(),old,image:candidate.Id,previousImageLine:line,groups:[g]};
const save=()=>fs.writeFileSync(root+'/portal-release.json',JSON.stringify(record,null,2)+'\n');
await releaseGroup(g,{save,preflight:async()=>{assert.equal(inspect(live.Name.slice(1)).Image,old);assert.equal(fs.readFileSync(file,'utf8'),before);},recreate:async()=>{if(!g.rollback){fs.writeFileSync(file,next);assert.deepEqual(shape(),original);}await recreateExistingGroup(g);},gate:async version=>{await checkExistingGroup(g,version);if(version==='new')for(const [path,term]of [['/en/guides/tasks-export','Trash'],['/es/guias/exportar-tareas','Papelera']]){const r=await fetch('https://utilibre.org'+path,{signal:AbortSignal.timeout(15000)});assert.equal(r.status,200);assert((await r.text()).includes(term));}},rollbackPins:async()=>{fs.writeFileSync(file,before);}});
record.status=g.status;record.completedAt=new Date().toISOString();save();console.log('Bilingual retention/help update deployed and public pages verified.');

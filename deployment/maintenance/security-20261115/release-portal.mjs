// Exact tested portal artifact only; reuse the existing release lock and rollback.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../language-final/release.mjs';
assert.deepEqual(process.argv.slice(2),['--apply']);process.umask(0o077);
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.on('exit',unlock);
const root='/var/lib/utilibre-maintenance/search-20261115';
const pin=JSON.parse(readFileSync(new URL('./portal-inputs.json',import.meta.url)));
assert.equal(pin.approved,true);
const sha=v=>createHash('sha256').update(v).digest('hex');
for(const [file,digest] of Object.entries(pin.evidence)){
 assert(/^[a-z0-9-]+\.(json|log)$/.test(file));assert.equal(sha(readFileSync(root+'/'+file)),digest,'Changed evidence '+file);
}
const gate=JSON.parse(readFileSync(root+'/portal-scan-gate.json'));
assert(gate.passed&&gate.base===pin.base&&gate.candidate===pin.imageId);assert.deepEqual(gate.retainedFindings,[]);
assert.equal(JSON.parse(readFileSync(root+'/portal-staging.json')).passed,true);
assert(readFileSync(root+'/final-e2e.log','utf8').includes('10 passed'));
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});
const inspect=n=>JSON.parse(docker('inspect',n))[0];
assert.equal(inspect(pin.candidate).Id,pin.imageId);
const name='public-utility-portal-1',x=inspect(name),labels=x.Config.Labels;
assert([pin.base,pin.imageId].includes(x.Image),'Production image drift');
const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[],rows:[{name,service:'portal',oldImage:pin.base,newImage:pin.imageId,oldContainerId:x.Id,oldRestartCount:x.RestartCount}]};
async function publicCheck(){
 for(const [path,needle] of [['/es/colecciones/documentos-y-tramites','Del PDF al archivo recibido'],['/en/collections/documents-and-applications','From a PDF to the received file'],['/es/guias/preparar-imagen','¿Te trabaste en un paso?'],['/en/guides/file-transfer','Stuck on a step?']]){
  const r=await fetch('https://utilibre.org'+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const body=await r.text();
  assert(body.includes(needle)&&body.includes('https://forms.utilibre.org/feedback'));
 }
}
if(x.Image===pin.imageId){await checkExistingGroup(g,'new');await publicCheck();console.log('Exact portal artifact already active and verified');process.exit(0);}
assert(Date.now()-Date.parse(pin.reviewedAt)<86400000,'Release review expired');
const other=JSON.parse(docker('inspect',...docker('ps','-q').trim().split('\n'))).filter(r=>r.Name!=='/'+name).map(r=>({id:r.Id,image:r.Image}));
const file=g.cwd+'/.env',before=readFileSync(file,'utf8'),line=before.match(/^PORTAL_IMAGE=.*$/m)?.[0];assert(line);assert.equal(inspect(line.slice(13)).Id,pin.base);
const after=before.replace(line,'PORTAL_IMAGE='+pin.candidate);
const shape=()=>{const {image,...s}=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services.portal;return sha(JSON.stringify(s));};const originalShape=shape();
const save=async()=>writeFileSync(root+'/portal-release.json',JSON.stringify({oldImage:pin.base,newImage:pin.imageId,previousImageLine:line,status:g.status,rollback:g.rollback,checkedAt:new Date().toISOString()},null,2)+'\n');
await releaseGroup(g,{save,preflight:async()=>{assert.equal(inspect(name).Image,pin.base);assert.equal(readFileSync(file,'utf8'),before);},recreate:async()=>{if(!g.rollback){writeFileSync(file,after);assert.equal(shape(),originalShape);}await recreateExistingGroup(g);},gate:async v=>{await checkExistingGroup(g,v);if(v==='new')await publicCheck();},rollbackPins:async()=>{assert.equal(readFileSync(file,'utf8'),after);writeFileSync(file,before);}});
for(const row of other)assert.equal(inspect(row.id).Image,row.image,'Unrelated container identity changed');
console.log('Portal released; exact image, health, EN/ES public journeys and unchanged unrelated container identities verified.');

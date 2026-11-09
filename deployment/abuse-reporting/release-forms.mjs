// Finite, notice-only LiberaForms release: two templates and their source recipe.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { acquireReleaseLock } from '../maintenance/security-20261103/release-lock.mjs';
import { existingComposeArgs, replaceImagePins, checkExistingGroup, recreateExistingGroup, releaseGroup } from '../maintenance/language-final/release.mjs';
import { checkPublished } from './check-customizations.mjs';

process.umask(0o077); assert.equal(process.argv[2], '--apply');
const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock'); process.once('exit', unlock);
const out = '/var/lib/utilibre-maintenance/security-20261109/abuse-reporting/late';
const read = file => JSON.parse(fs.readFileSync(file));
const sha = data => createHash('sha256').update(data).digest('hex');
const docker = (...args) => cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']});
const inspect = name => JSON.parse(docker('inspect',name))[0];
const image = read(out+'/forms-image.json'), source = read(out+'/forms-source.json'), browser = read(out+'/browser.json');
const plan = read(new URL('late-inputs.json',import.meta.url)).liberaforms;
assert(image.passed && image.allOtherFilesAndConfigurationUnchanged && source.passed && source.sourceReplayMatchesCandidateTemplates);
assert(browser.passed && browser.results.filter(r=>r.surface!=='rustpad/').length===6);
assert.equal(inspect(image.candidate).Id,image.imageId);
const current = inspect('utilibre-pack-forms-app-1'), labels = current.Config.Labels;
assert.equal(current.Image,image.baseImage); assert.equal(current.Image,plan.baseImage);
const group = {key:'forms',project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),before:[200],rows:[{name:current.Name.slice(1),service:'app',oldImage:current.Image,newImage:image.imageId,oldContainerId:current.Id,oldRestartCount:current.RestartCount}]};
assert.equal(group.files.length,1);
const composeFile=group.files[0], oldCompose=fs.readFileSync(composeFile,'utf8');
const change=replaceImagePins(oldCompose,[{from:current.Config.Image,to:image.candidate}]); assert.equal(change.replaced,1);
const configShape=()=>{const cfg=JSON.parse(docker(...existingComposeArgs(group),'config','--format','json'));delete cfg.services.app.image;return sha(JSON.stringify(cfg));};
const oldShape=configShape(), siblings=['utilibre-pack-forms-db-1','utilibre-pack-forms-web-1'].map(name=>({name,id:inspect(name).Id}));
const oldArchive=fs.readFileSync(source.source), newArchive=fs.readFileSync(source.candidate);
assert.equal(sha(oldArchive),source.beforeSha256); assert.equal(sha(newArchive),source.afterSha256);
assert.equal(sha(fs.readFileSync(new URL('../pack/liberaforms-privacy.py',import.meta.url))),source.recipeAfterSha256);
fs.writeFileSync(out+'/forms-source-before.tar.gz',oldArchive);fs.writeFileSync(out+'/forms-compose-before.yaml',oldCompose);
const save=()=>fs.writeFileSync(out+'/forms-release.json',JSON.stringify({status:group.status,group,source:{beforeSha256:source.beforeSha256,afterSha256:source.afterSha256,changedEntries:source.changedEntries}},null,2)+'\n');
function archiveReplace(bytes) {
  const stat=fs.statSync(source.source), temporary=source.source+'.report-'+process.pid;
  const fd=fs.openSync(temporary,'wx',stat.mode&0o777);
  try{fs.writeFileSync(fd,bytes);fs.fchmodSync(fd,stat.mode&0o777);fs.fchownSync(fd,stat.uid,stat.gid);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  fs.renameSync(temporary,source.source);
}
const diagnosed=async(phase,action)=>{try{return await action();}catch(error){fs.writeFileSync(out+'/forms-'+phase+'-error.txt',String(error.stack)+'\n');throw error;}};
await releaseGroup(group,{
  save,
  preflight:async()=>{
    assert.equal(inspect(group.rows[0].name).Image,image.baseImage);
    assert.equal(fs.readFileSync(composeFile,'utf8'),oldCompose);
    assert.equal(sha(fs.readFileSync(source.source)),source.beforeSha256);
  },
  recreate:async()=>diagnosed('activate',async()=>{
    if(!group.rollback){archiveReplace(newArchive);fs.writeFileSync(composeFile,change.text);}
    assert.equal(configShape(),oldShape);await recreateExistingGroup(group);
  }),
  gate:async version=>diagnosed('gate-'+version,async()=>{
    await checkExistingGroup(group,version);assert.equal(configShape(),oldShape);
    for(const sibling of siblings)assert.equal(inspect(sibling.name).Id,sibling.id,'Unrelated Forms service changed');
    for(const file of plan.files)assert.equal(sha(docker('exec',group.rows[0].name,'cat',file.target)),file[version==='new'?'afterSha256':'beforeSha256']);
    assert.equal(sha(fs.readFileSync(source.source)),version==='new'?source.afterSha256:source.beforeSha256);
    if(version==='new'){
      const html=await(await fetch('https://forms.utilibre.org/',{signal:AbortSignal.timeout(20000)})).text();
      for(const href of ['https://utilibre.org/en/abuse','https://utilibre.org/es/denunciar-abuso','/utilibre-source/liberaforms-utilibre.tar.gz'])assert(html.includes(href));
      await checkPublished('forms',out);
      const response=await fetch('https://forms.utilibre.org/utilibre-source/liberaforms-utilibre.tar.gz',{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200);
      assert.equal(sha(Buffer.from(await response.arrayBuffer())),source.afterSha256);
    }
    group.runtimeConfigurationUnchanged=true;group.databaseAndWebContainersUnchanged=true;
  }),
  rollbackPins:async()=>{
    assert.equal(fs.readFileSync(composeFile,'utf8'),change.text);
    assert.equal(sha(fs.readFileSync(source.source)),source.afterSha256);
    fs.writeFileSync(composeFile,oldCompose);archiveReplace(oldArchive);
  },
});
group.completedAt=new Date().toISOString();group.storageNote='Only application templates and source recipe changed; no migrations or submitted content accessed.';save();
console.log('LiberaForms reporting footers and matching source recipe are live; scoped gates passed.');

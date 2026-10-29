#!/usr/bin/env node
// Explicit isolated Docker integration test; never part of the daily job.
// No public requests, published ports, production configuration or volumes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {ROOT,STATE,command,activate,atomic} from './redlib-maintain.mjs';
import {recreateExistingGroup} from '../deployment/maintenance/language-final/release.mjs';
process.umask(0o077);
const recipe=JSON.parse(readFileSync(ROOT+'/config/redlib/recipe.json'));
const docker=(...args)=>command(['docker',...args]);
const inspect=name=>JSON.parse(docker('inspect',name))[0];
const production=()=>docker('ps','--filter','label=com.docker.compose.project=public-utility','--format','{{.Names}} {{.ID}}').trim().split('\n').sort();
const before=production(),project='utilibre-redlib-test-'+randomUUID();
mkdirSync(STATE,{recursive:true,mode:0o700});
const run=mkdtempSync(STATE+'/integration-'),file=run+'/compose.json',name=project+'-redlib-1';
const g={project,cwd:run,files:[file],before:[],status:'prepared',rows:[{service:'redlib',name,oldImage:recipe.runtime.imageId,newImage:recipe.candidate.imageId}]};
let fault=false,selected='old';
const pin=async version=>{
 selected=version;
 const config={services:{redlib:{image:recipe[version==='old'?'runtime':'candidate'].imageId,network_mode:'none',read_only:true,cap_drop:['ALL'],security_opt:['no-new-privileges:true'],cpus:0.1,mem_limit:'64m',memswap_limit:'64m',pids_limit:16,logging:{driver:'none'},healthcheck:{disable:true},entrypoint:['/bin/sh','-ec',fault&&version==='new'?'exit 42':'exec sleep 600']}}};
 atomic(file,JSON.stringify(config,null,2)+'\n');
};
const j={group:g},save=async()=>atomic(run+'/journal.json',JSON.stringify(j,null,2)+'\n');
const ops={validate:async()=>{assert.equal(inspect(recipe.runtime.reference).Id,recipe.runtime.imageId);assert.equal(inspect(recipe.candidate.reference).Id,recipe.candidate.imageId);},save,pin,recreate:()=>recreateExistingGroup(g),gate:async version=>{
 await new Promise(resolve=>setTimeout(resolve,1000));const x=inspect(name);
 assert.equal(x.Image,g.rows[0][version+'Image']);assert.equal(x.State.Running,true);assert.equal(x.HostConfig.NetworkMode,'none');assert.equal(x.Mounts.length,0);assert.equal(Object.keys(x.HostConfig.PortBindings||{}).length,0);
}};
try{
 await pin('old');await ops.recreate();await ops.gate('old');
 await activate(j,ops);assert.equal(g.status,'passed');assert.equal(selected,'new');
 fault=true;g.status='prepared';await assert.rejects(activate(j,ops),/rollback verified/);
 assert.equal(g.rollback,'verified');assert.equal(selected,'old');await ops.gate('old');
 assert.deepEqual(production(),before,'Production containers changed during isolated test');
 atomic(run+'/result.json',JSON.stringify({passed:true,at:new Date().toISOString(),successfulActivation:true,failedCandidateRollback:true,productionContainersUnchanged:true,externalNetwork:false,limitations:'Tests Compose transaction and image restoration with harmless commands. Native Redlib browsing is checked separately by --stage.'},null,2)+'\n');
 console.log('Isolated activation and rollback passed: '+run+'/result.json');
}finally{
 if(docker('ps','-aq','--filter','name=^/'+name+'$').trim()){
  assert.equal(inspect(name).Config.Labels['com.docker.compose.project'],project);docker('rm','-f',name);
 }
}

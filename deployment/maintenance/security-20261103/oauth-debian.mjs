// Finite source backport: isolated candidates only; no production mutation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261103/oauth-debian';
const inputs=JSON.parse(fs.readFileSync(here+'oauth-debian-inputs.json')),s=inputs.rows[0],dir=root+'/'+s.key;
const sha=b=>createHash('sha256').update(b).digest('hex');fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Preserve completed evidence');
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:16*1024**2,stdio:['pipe','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('OAuth preparation failed; private diagnostics retained');}};
const docker=(a,o)=>run('docker',a,o),config=i=>JSON.parse(docker(['image','inspect',i]))[0];
assert.equal(docker(['inspect',s.containers[0],'--format','{{.Image}}']),s.base);assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=8*1024**3);
const work=fs.mkdtempSync('/tmp/utilibre-oauth-debian-');
const native=(image,mode,file=here+'oauth-debian-check.py')=>JSON.parse(docker(['run','--rm','-i','--pull=never','--network=none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user','65534:65534','--cpus=1','--memory=512m','--memory-swap=512m','--pids-limit=64','--ulimit','core=0','--log-driver=none','--entrypoint',s.python,image,'-B','-',mode],{input:fs.readFileSync(file)}));
try{
 const baseline=native(s.base,'baseline');assert(baseline.passed&&baseline.identityEscalationReproduced&&baseline.checks===13);
 const id=docker(['create','--entrypoint','/bin/true',s.base]);
 try{for(const f of s.files){fs.mkdirSync(work+'/'+f.path.split('/').slice(0,-1).join('/'),{recursive:true});docker(['cp',id+':'+s.site+'/'+f.path,work+'/'+f.path]);assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.beforeSha256);}}
 finally{docker(['rm',id]);}
 for(const p of inputs.patches){const b=fs.readFileSync(here+p.file);assert.equal(sha(b),p.sha256);fs.writeFileSync(work+'/'+p.file,b);run('git',['apply','--check',p.file],{cwd:work});run('git',['apply',p.file],{cwd:work});}
 const old=config(s.base);let recipe='FROM '+s.base+'\nUSER 0\n';
 for(const f of s.files){assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.afterSha256);fs.chmodSync(work+'/'+f.path,0o644);recipe+='COPY '+f.path+' '+s.site+'/'+f.path+'\n';}
 recipe+='USER '+(old.Config.User||'0')+'\n';fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
 docker(['build','--network=none','--pull=false','--memory=512m','--cpu-period=100000','--cpu-quota=100000','-t',s.candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const next=config(s.candidate);assert.deepEqual({...next.Config,User:old.Config.User},old.Config);
 const current=native(next.Id,'fixed');assert(current.passed&&current.identityMismatchRejected&&current.checks===13);
 // Existing exact Kuma crypto/Apprise/OAuth1 consumer test, no notifications.
 const consumer=native(next.Id,'--candidate',here+'../kuma-crypto-final/native.py');assert(consumer.passed&&consumer.oauthlib==='3.2.2');
 // Docker's saved layer must contain exactly the two reviewed source files.
 // Application/configuration/user state is inherited; no package-manager run.
 const history=JSON.parse(docker(['image','inspect',s.base]))[0].RootFS.Layers;
 assert.deepEqual(next.RootFS.Layers.slice(0,history.length),history);assert.equal(next.RootFS.Layers.length,history.length+2);
 const result={date:new Date().toISOString(),...s,imageId:next.Id,passed:true,deployed:false,configurationUnchanged:true,baseline,native:current,consumer,fixtureSha256:sha(fs.readFileSync(here+'oauth-debian-check.py')),consumerFixtureSha256:sha(fs.readFileSync(here+'../kuma-crypto-final/native.py')),changedFiles:s.files.map(f=>s.site+'/'+f.path),patches:inputs.patches};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2)+'\n');console.log('Offline OAuth identity regression and native Kuma consumers passed; candidate not deployed.');
}finally{fs.rmSync(work,{recursive:true});}

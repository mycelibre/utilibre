import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const [input,out]=process.argv.slice(2);assert(process.argv.length===4&&path.isAbsolute(input)&&path.isAbsolute(out));assert(!fs.existsSync(out));
const prepared=JSON.parse(fs.readFileSync(input+'/preparation.json'));assert.equal(prepared.status,'prepared-not-built');
const space=fs.statfsSync('/opt/utilibre');assert(space.bavail*space.bsize>8*1024**3,'Preserve recovery disk floor');
fs.mkdirSync(out,{mode:0o700});const cid=out+'/container.cid',image='sha256:f45539e1b2380da919ac34c184cb1a19b0c7a1037f993fd30ae37a1a1f8b8604';
const script=new URL('./username-build.sh',import.meta.url).pathname;
const args=['run','--rm','--cidfile',cid,'--pull=never','--network=none','--cap-drop=ALL','--security-opt=no-new-privileges','--cpus=2','--memory=3g','--memory-swap=3g','--pids-limit=256','--ulimit','core=0','--tmpfs','/build:rw,exec,nosuid,nodev,size=1536m,mode=700','--tmpfs','/tmp:rw,exec,nosuid,nodev,size=128m,mode=1777','--mount',`type=bind,src=${input},dst=/input,readonly`,'--mount',`type=bind,src=${out},dst=/output`,'--mount',`type=bind,src=${script},dst=/build-script.sh,readonly`,'--entrypoint','sh',image,'/build-script.sh'];
try{
 const log=cp.execFileSync('docker',args,{encoding:'utf8',timeout:900000,maxBuffer:20*1024**2,stdio:['ignore','pipe','pipe']});fs.writeFileSync(out+'/build.log',log);assert(fs.existsSync(out+'/build-completed.json'));console.log('Offline native SSH candidate build passed; not installed.');
}catch(e){fs.writeFileSync(out+'/build-error.log',String(e.stdout||'')+'\n'+String(e.stderr||e.message));throw Error('Candidate build failed; inspect private build-error.log');}
finally{if(fs.existsSync(cid)){const own=fs.readFileSync(cid,'utf8').trim();assert(/^[a-f0-9]{64}$/.test(own));try{cp.execFileSync('docker',['rm','-f',own],{stdio:'pipe',timeout:15000});}catch(e){assert(String(e.stderr).includes('No such container'));}}}

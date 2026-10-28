// One exact native-wheel repair, preserving all previous TRIP fixes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {wheels,output as caRoot} from '../certifi-20261021/specs.mjs';
process.umask(0o077);
const s=JSON.parse(fs.readFileSync(new URL('./authlib-inputs.json',import.meta.url))).rows[0];
const dir='/var/lib/utilibre-maintenance/security-20261028/authlib/trip';fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
const sha=b=>createHash('sha256').update(b).digest('hex'),docker=(a,opt={})=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Authlib preparation failed; private error retained');}};
assert.equal(docker(['inspect','--format','{{.Image}}',s.containers[0]]).trim(),s.base);const disk=fs.statfsSync(dir);assert(disk.bavail*disk.bsize>=8*1024**3);
const native=(image,file,args)=>docker(['run','--rm','-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--log-driver','none','--entrypoint','python',image,'-B','-',...args],{input:fs.readFileSync(new URL(file,import.meta.url))});
const before=JSON.parse(native(s.base,'../certifi-20261021/check.py',[s.site,'2026.10.19'])),baseline=JSON.parse(native(s.base,'./authlib-check.py',['1.8.0']));assert(!baseline.emptySignaturesRejected);
const work=fs.mkdtempSync('/tmp/utilibre-authlib-');
try{
 const wheel=s.wheel,stored=dir+'/'+wheel.file;let bytes;
 if(fs.existsSync(stored))bytes=fs.readFileSync(stored);else{const r=await fetch(wheel.url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),wheel.sha256);fs.writeFileSync(stored,bytes);}
 assert.equal(sha(bytes),wheel.sha256);fs.writeFileSync(work+'/'+wheel.file,bytes,{mode:0o644});const pip=wheels[1];assert.equal(sha(fs.readFileSync(caRoot+'/'+pip.file)),pip.sha256);fs.copyFileSync(caRoot+'/'+pip.file,work+'/'+pip.file);fs.chmodSync(work+'/'+pip.file,0o644);
 const old=JSON.parse(docker(['image','inspect',s.base]))[0],temp='/tmp/utilibre-authlib-20261028';
 const recipe=`FROM ${s.base}\nUSER 0\nCOPY ${wheel.file} ${pip.file} ${temp}/\nRUN PYTHONPATH=${temp}/${pip.file} python -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall ${temp}/${wheel.file} && rm ${temp}/${wheel.file} ${temp}/${pip.file} && rmdir ${temp}\nUSER ${old.Config.User}\n`;
 fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);docker(['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const next=JSON.parse(docker(['image','inspect',s.candidate]))[0];assert.deepEqual(next.Config,old.Config);
 const after=JSON.parse(native(next.Id,'../certifi-20261021/check.py',[s.site,'2026.10.19'])),normal=JSON.parse(native(next.Id,'./authlib-check.py',['1.9.1']));assert(normal.emptySignaturesRejected);
 const changes=[];for(const p of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(JSON.stringify(before.files[p])!==JSON.stringify(after.files[p])){assert(['/authlib/','/authlib-1.8.0.dist-info/','/authlib-1.9.1.dist-info/'].some(x=>p.startsWith(s.site+x)),'Unexpected dependency change: '+p);changes.push(p);}
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,imageId:next.Id,passed:true,deployed:false,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,existingCertifiFixPreserved:true,changedFiles:changes.sort(),baseline,native:normal},null,2)+'\n');console.log('TRIP Authlib: vulnerable baseline reproduced; signature and application OAuth controls pass after repair');
}finally{fs.rmSync(work,{recursive:true});}

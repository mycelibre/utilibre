// Finite upstream wheel/backport preparation. No resolver, credentials or live DNS.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {wheels,output as caRoot} from '../certifi-20261021/specs.mjs';
process.umask(0o077);
const drf=process.argv.includes('--drf'),profile=drf?'drf':'dnspython',inputs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url))),keys=process.argv.slice(2).filter(k=>k!=='--drf'),root='/var/lib/utilibre-maintenance/security-20261028/'+profile;
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const key of keys){
 const s=inputs.rows.find(s=>s.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Preserve completed candidate');
 const run=(p,a,opt={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error(key+': preparation failed; private diagnostics retained');}},docker=(a,opt)=>run('docker',a,opt);
 const native=(image,file,args)=>docker(['run','--rm','-i','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--pids-limit','64','--log-driver','none','--entrypoint',s.python,image,'-B','-',...args],{input:fs.readFileSync(new URL(file,import.meta.url))});
 for(const name of s.containers)assert.equal(docker(['inspect','--format','{{.Image}}',name]).trim(),s.base);
 const disk=fs.statfsSync(root);assert(disk.bavail*disk.bsize>=8*1024**3);
 const before=JSON.parse(native(s.base,'../certifi-20261021/check.py',[s.site,'2026.10.19'])),baseline=JSON.parse(native(s.base,'./'+profile+'-check.py',[s.previous,'baseline']));
 const work=fs.mkdtempSync('/tmp/utilibre-dnspython-');
 try{
  const old=JSON.parse(docker(['image','inspect',s.base]))[0];let recipe=`FROM ${s.base}\nUSER 0\n`;
  if(s.method==='upstream-wheel'){
   const wheel=inputs.wheel,stored=root+'/'+wheel.file;let bytes;
   if(fs.existsSync(stored))bytes=fs.readFileSync(stored);else{const r=await fetch(wheel.url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),wheel.sha256);fs.writeFileSync(stored,bytes);}
   assert.equal(sha(bytes),wheel.sha256);fs.writeFileSync(work+'/'+wheel.file,bytes,{mode:0o644});const pip=wheels[1];assert.equal(sha(fs.readFileSync(caRoot+'/'+pip.file)),pip.sha256);fs.copyFileSync(caRoot+'/'+pip.file,work+'/'+pip.file);fs.chmodSync(work+'/'+pip.file,0o644);
   const temp='/tmp/utilibre-dnspython-20261028';recipe+=`COPY ${wheel.file} ${pip.file} ${temp}/\nRUN PYTHONPATH=${temp}/${pip.file} ${s.python} -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall ${temp}/${wheel.file} && rm ${temp}/${wheel.file} ${temp}/${pip.file} && rmdir ${temp}\n`;
  }else if(drf){
   const cid=docker(['create','--entrypoint','/bin/true',s.base]).trim();
   try{for(const f of s.files){fs.mkdirSync(work+'/'+f.path.split('/').slice(0,-1).join('/'),{recursive:true});docker(['cp',cid+':'+s.site+'/'+f.path,work+'/'+f.path]);assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.beforeSha256);}}
   finally{docker(['rm',cid]);}
   for(const p of inputs.patches){const bytes=fs.readFileSync(new URL('./'+p.file,import.meta.url));assert.equal(sha(bytes),p.sha256);fs.writeFileSync(work+'/'+p.file,bytes);run('git',['apply','--check',p.file],{cwd:work});run('git',['apply',p.file],{cwd:work});}
   for(const f of s.files){assert.equal(sha(fs.readFileSync(work+'/'+f.path)),f.afterSha256);fs.chmodSync(work+'/'+f.path,0o644);recipe+=`COPY ${f.path} ${s.site}/${f.path}\n`;}
  }else{
   assert.equal(s.key,'simplelogin');const patch=fs.readFileSync(new URL('./dnspython-pointer-chain.patch',import.meta.url));assert.equal(sha(patch),inputs.patchSha256);
   const cid=docker(['create','--entrypoint','/bin/true',s.base]).trim();fs.mkdirSync(work+'/dns');try{docker(['cp',cid+':'+s.site+'/dns/name.py',work+'/dns/name.py']);}finally{docker(['rm',cid]);}
   assert.equal(sha(fs.readFileSync(work+'/dns/name.py')),s.beforeSha256);fs.writeFileSync(work+'/fix.patch',patch);run('git',['apply','--check','fix.patch'],{cwd:work});run('git',['apply','fix.patch'],{cwd:work});assert.equal(sha(fs.readFileSync(work+'/dns/name.py')),s.afterSha256);
   fs.chmodSync(work+'/dns/name.py',0o644);recipe+=`COPY dns/name.py ${s.site}/dns/name.py\n`;
  }
  recipe+=`USER ${old.Config.User}\n`;fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
  docker(['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=JSON.parse(docker(['image','inspect',s.candidate]))[0];assert.deepEqual(next.Config,old.Config);
  const after=JSON.parse(native(next.Id,'../certifi-20261021/check.py',[s.site,'2026.10.19'])),normal=JSON.parse(native(next.Id,'./'+profile+'-check.py',[s.method==='upstream-wheel'?'2.9.0':s.previous,'fixed']));
  const changes=[];for(const p of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(JSON.stringify(before.files[p])!==JSON.stringify(after.files[p])){if(drf)assert(s.files.some(f=>p===s.site+'/'+f.path),'Unexpected DRF file change');else if(s.method==='upstream-backport')assert.equal(p,s.site+'/dns/name.py');else assert(['/dns/','/dnspython-'+s.previous+'.dist-info/','/dnspython-2.9.0.dist-info/'].some(x=>p.startsWith(s.site+x)),'Unexpected dependency change: '+p);changes.push(p);}
  assert(changes.length);fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,imageId:next.Id,passed:true,deployed:false,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,existingCertifiFixPreserved:true,changedFiles:changes.sort(),baseline,native:normal},null,2)+'\n');console.log(key+': '+(drf?'DRF charset/header/token regressions and legitimate API compatibility pass':'baseline reproduced; DNS rejection, legitimate UDP/TCP and email validation pass'));
 }finally{fs.rmSync(work,{recursive:true});}
}

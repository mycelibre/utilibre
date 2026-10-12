import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,packages,output} from './specs.mjs';
process.umask(0o077);
const s=specs.find(x=>x.key===process.argv[2]);assert(s,'Unknown exact target');
const dir=output+'/'+s.key;fs.mkdirSync(dir,{recursive:true});
const scratch=fs.mkdtempSync('/dev/shm/utilibre-patch-leaves-');
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(cmd,args,opt={})=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Patch-leaf command failed; private diagnostic '+dir+'/error.log');}};
const docker=(args,opt)=>run('docker',args,opt),image=id=>JSON.parse(docker(['image','inspect',id]))[0];
const free=()=>{const f=fs.statfsSync('/');return f.bavail*f.bsize;};
const native=(id,code,args=[])=>docker(['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint',s.runtime,id,'-',...args],{input:code});
const manifestCode=`const fs=require('fs'),path=require('path'),crypto=require('crypto');let out={};function w(d){for(const n of fs.readdirSync(d).sort()){const p=path.join(d,n),st=fs.lstatSync(p);if(st.isDirectory())w(p);else if(st.isFile())out[p]={sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),mode:st.mode&511};else if(st.isSymbolicLink())out[p]={link:fs.readlinkSync(p)};}}w(process.argv[2]);console.log(JSON.stringify(out));`;
try{
 assert(free()>8.15*1024**3,'Insufficient guarded disk reserve');
 assert.equal(docker(['inspect','--format','{{.Image}}',s.container]).trim(),s.base,'Live base changed; coordinate before rebuilding');
 const before=JSON.parse(native(s.base,manifestCode,[s.root]));const retained=[],removed=[];
 let dockerfile='FROM '+s.base+'\n';
 for(const [name,target]of Object.entries(s.paths)){
  const pin=packages[name];const url='https://registry.npmjs.org/'+encodeURIComponent(name)+'/'+pin.version;
  const res=await fetch(url);assert(res.ok);const meta=await res.json();assert.equal(meta.name,name);assert.equal(meta.version,pin.version);assert.equal(meta.dist.integrity,pin.integrity);assert.equal(new URL(meta.dist.tarball).hostname,'registry.npmjs.org');
  const tarResponse=await fetch(meta.dist.tarball);assert(tarResponse.ok);const bytes=Buffer.from(await tarResponse.arrayBuffer());assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),pin.integrity);assert(bytes.length<40*1024**2);
  const index=retained.length,pkgdir=scratch+'/pkg'+index,archive=scratch+'/pkg'+index+'.tgz';fs.mkdirSync(pkgdir,{mode:0o755});fs.writeFileSync(archive,bytes);
  const names=run('tar',['-tzf',archive]).trim().split('\n');assert(names.every(n=>n.startsWith('package/')&&!n.split('/').includes('..')&&!n.includes('\0')),'Unsafe package path');
  run('tar',['--no-same-owner','--same-permissions','-xzf',archive,'--strip-components=1','-C',pkgdir]);
  // npm archives omit some directory entries; an operator umask of 077 must not
  // make these runtime dependencies unreadable to the original non-root user.
  const readable=d=>{fs.chmodSync(d,0o755);for(const n of fs.readdirSync(d)){const p=d+'/'+n,st=fs.lstatSync(p);if(st.isDirectory())readable(p);else {assert(st.isFile(),'Unexpected dependency symlink');fs.chmodSync(p,(st.mode&0o111)?0o755:0o644);}}};readable(pkgdir);
  const oldFiles=Object.keys(before).filter(p=>p.startsWith(target+'/')&&!p.startsWith(target+'/node_modules/'));
  for(const p of oldFiles)if(!fs.existsSync(pkgdir+p.slice(target.length))){assert(s.removedFiles?.includes(p),'Upstream removed file requires explicit removal review: '+p);removed.push(p);}
  // No scripts run, no package manager or solver, and no unrelated dependency changes.
  dockerfile+='COPY pkg'+index+'/ '+target+'/\n';
  retained.push({name,...pin,url,tarball:meta.dist.tarball,archiveSha256:sha(bytes),bytes:bytes.length,license:meta.license,target});
 }
 if(removed.length){assert.deepEqual([...removed].sort(),[...s.removedFiles].sort());for(const p of removed)assert(/^\/app\/frontend\/node_modules\/@img\/[A-Za-z0-9/_.-]+$/.test(p));dockerfile+='USER 0\nRUN rm '+removed.map(p=>JSON.stringify(p)).join(' ')+'\nUSER '+image(s.base).Config.User+'\n';}
 fs.writeFileSync(scratch+'/Dockerfile',dockerfile);
 const logs=fs.openSync(dir+'/build.log','w');
 const child=cp.spawn('docker',['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,scratch],{env:{...process.env,DOCKER_BUILDKIT:'0'},stdio:['ignore',logs,logs]});
 const timer=setInterval(()=>{if(free()<8*1024**3)child.kill('SIGTERM');},250);
 const code=await new Promise(r=>child.once('exit',r));clearInterval(timer);fs.closeSync(logs);assert.equal(code,0,'Guarded build failed');
 const old=image(s.base),next=image(s.candidate);for(const k of ['Env','User','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(next.Config[k],old.Config[k],k);
 const after=JSON.parse(native(next.Id,manifestCode,[s.root]));const allowed=p=>Object.values(s.paths).some(t=>p===t||p.startsWith(t+'/'));
 const changed=[];for(const p of new Set([...Object.keys(before),...Object.keys(after)])){if(JSON.stringify(before[p])!==JSON.stringify(after[p])){assert(allowed(p),'Unrelated application file changed: '+p);changed.push(p);}}
 assert(changed.length);const versions=JSON.parse(native(next.Id,`const f=require('fs');const paths=JSON.parse(process.argv[2]);console.log(JSON.stringify(Object.fromEntries(Object.entries(paths).map(([n,p])=>[n,JSON.parse(f.readFileSync(p+'/package.json')).version]))));`,[JSON.stringify(s.paths)]));
 for(const [name]of Object.entries(s.paths))assert.equal(versions[name],packages[name].version);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),...s,imageId:next.Id,packages:retained,versions,configurationUnchanged:true,unchangedOtherAppFiles:Object.keys(before).filter(p=>!allowed(p)).length,changedPackageFiles:changed.length,applicationManifestBefore:sha(JSON.stringify(before)),applicationManifestAfter:sha(JSON.stringify(after)),passed:true,deployed:false},null,2)+'\n');
 fs.writeFileSync(dir+'/changed-files.json',JSON.stringify(changed,null,2)+'\n');console.log(JSON.stringify({key:s.key,imageId:next.Id,changedPackageFiles:changed.length,passed:true,deployed:false}));
}finally{fs.rmSync(scratch,{recursive:true,force:true});}

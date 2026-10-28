// Same-major official Node binary overlays. No npm graph or app/config replacement.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileManifest} from '../js-closure/build.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028',specs=JSON.parse(fs.readFileSync(new URL('./node-inputs.json',import.meta.url))).rows;
const artifacts=JSON.parse(fs.readFileSync(new URL('./node-artifacts.json',import.meta.url))),keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const limits=['run','--rm','-i','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','128','--log-driver','none'];
const run=(args,options={})=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:240000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...options}).trim();
const inspect='console.log(JSON.stringify({versions:process.versions,execPath:process.execPath,arch:process.arch,glibc:process.report.getReport().header.glibcVersionRuntime}))';
for(const key of keys){
 const s=specs.find(s=>s.key===key),a=artifacts.find(a=>a.key===s.artifact),dir=root+'/node/'+key;assert(a&&a.version.split('.')[0]===s.beforeVersion.split('.')[0]);fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=8*1024**3);for(const n of s.containers)assert.equal(run(['inspect','--format','{{.Image}}',n]),s.base);
 const binary=root+'/node-artifacts/'+a.key+'/node';assert.equal(sha(fs.readFileSync(binary)),a.nodeSha256);assert.equal(run(['image','inspect','--format','{{.Id}}',a.source]),a.imageId);
 const node=(image,code,args=[])=>run([...limits,'--entrypoint',s.binary,image,'-',...args],{input:code});
 const before=JSON.parse(node(s.base,inspect));assert.equal(before.versions.node,s.beforeVersion);assert.equal(before.versions.modules,s.modules);assert.equal(before.execPath,s.binary);assert.equal(before.arch,'x64');assert.equal(Boolean(before.glibc),s.artifact.endsWith('glibc'));
 const roots=JSON.parse(node(s.base,'const fs=require("fs");console.log(JSON.stringify(["/app","/opt","/usr/local","/usr/bin","/home/node","/usr/src","/srv","/cryptpad","/grist"].filter(p=>fs.existsSync(p))))'));
 const original=JSON.parse(node(s.base,fileManifest,[JSON.stringify(roots)])),config=JSON.parse(run(['image','inspect','--format','{{json .Config}}',s.base]));
 fs.linkSync(binary,dir+'/node');fs.chmodSync(dir+'/node',0o755);fs.writeFileSync(dir+'/Dockerfile',`FROM ${s.base}\nCOPY node ${s.binary}\n`);
 try{fs.writeFileSync(dir+'/build.log',run(['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,dir],{env:{...process.env,DOCKER_BUILDKIT:'0'}}));}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stderr||e.message));throw e;}
 const imageId=run(['image','inspect','--format','{{.Id}}',s.candidate]);assert.deepEqual(JSON.parse(run(['image','inspect','--format','{{json .Config}}',imageId])),config);
 const after=JSON.parse(node(imageId,inspect));assert.equal(after.versions.node,a.version);assert.equal(after.versions.modules,s.modules);assert.deepEqual(after.versions,a.components);
 const fresh=JSON.parse(node(imageId,fileManifest,[JSON.stringify(roots)])),changes=[...new Set([...Object.keys(original),...Object.keys(fresh)])].filter(p=>JSON.stringify(original[p])!==JSON.stringify(fresh[p]));assert.deepEqual(changes,[s.binary]);assert.equal(fresh[s.binary].sha256,a.nodeSha256);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId,passed:true,configurationUnchanged:true,binarySha256:a.nodeSha256,artifact:a,previousRuntime:before,currentRuntime:after,applicationRoots:roots,unchangedOtherAppFiles:Object.keys(fresh).length-1,changedFiles:changes,deployed:false},null,2)+'\n');console.log(key+': official same-major runtime, native ABI and unchanged app files verified');
}

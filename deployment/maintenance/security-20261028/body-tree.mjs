// Finite dependency-graph repairs: native npm lockfiles, scoped to one package.
// Shared application dependencies are never replaced to satisfy this package.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {fileManifest} from '../js-closure/build.mjs';
process.umask(0o077);
const markdown=process.argv.includes('--markdown'),profile=markdown?'markdown':'body',packageName=markdown?'markdown-it':'body-parser';
const root='/var/lib/utilibre-maintenance/security-20261028',data=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url))),bundles=JSON.parse(fs.readFileSync(new URL('./'+profile+'-locks.json',import.meta.url)));
const keys=process.argv.slice(2).filter(k=>k!=='--markdown');assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>(markdown?['rsshub']:['grist-body','actual']).includes(k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...o});
const docker=(a,o)=>run('docker',a,o).trim();
const config=id=>JSON.parse(docker(['image','inspect','--format','{{json .Config}}',id]));
const node=(id,code,args)=>docker(['run','--rm','-i','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','1g','--memory-swap','1g','--log-driver','none','--entrypoint','node',id,'-',...args],{input:code});
for(const key of keys){
 const s=data.rows.find(s=>s.key===key),dir=root+'/'+profile+'/'+key;assert(s.dependencyBundle&&bundles[s.dependencyBundle]);assert(!fs.existsSync(dir+'/build.json'));fs.mkdirSync(dir,{recursive:true});
 assert.equal(docker(['inspect','--format','{{.Image}}',s.container]),s.base);
 const bundle=bundles[s.dependencyBundle],source=root+'/'+profile+'-dependencies/'+s.dependencyBundle,lock=fs.readFileSync(source+'/package-lock.json');assert.equal(sha(lock),bundle.lockSha256);
 const tree=JSON.parse(lock);assert.equal(tree.lockfileVersion,3);for(const [path,p]of Object.entries(tree.packages)){if(!path)continue;assert(p.integrity&&new URL(p.resolved).hostname==='registry.npmjs.org');}
 // Acquisition generated this exact lock. Replay is npm ci --ignore-scripts,
 // with this committed lock; neither install scripts nor app credentials apply.
 const sourceManifest=JSON.parse(run('node',['-',JSON.stringify([source+'/node_modules'])],{input:fileManifest}));
 const normalized=Object.fromEntries(Object.entries(sourceManifest).map(([p,v])=>[p.slice(source.length),v]));assert.equal(sha(JSON.stringify(normalized)),bundle.treeSha256,'Downloaded dependency content changed');
 const old=config(s.base),before=JSON.parse(node(s.base,fileManifest,[JSON.stringify(s.roots)]));
 const installed=JSON.parse(node(s.base,'const fs=require("fs");console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+"/package.json")).version]))))',[JSON.stringify(Object.keys(s.before))]));assert.deepEqual(installed,s.before,'Unsupported package baseline');
 const work=fs.mkdtempSync(root+'/body-tree-'),payload=work+'/payload';fs.mkdirSync(payload);
 try{
  fs.cpSync(source+'/node_modules/'+packageName,payload,{recursive:true});fs.mkdirSync(payload+'/node_modules',{recursive:true});
  for(const entry of fs.readdirSync(source+'/node_modules'))if(entry!==packageName&&entry!=='.package-lock.json'){
   // npm's verified CLI link is acquisition metadata, not a nested dependency.
   // The upstream bin/markdown-it.mjs and argparse are retained in the payload.
   if(markdown&&entry==='.bin'){assert.deepEqual(fs.readdirSync(source+'/node_modules/.bin'),['markdown-it']);assert.equal(fs.readlinkSync(source+'/node_modules/.bin/markdown-it'),'../markdown-it/bin/markdown-it.mjs');continue;}
   assert(entry!=='.bin','Unexpected install executables');fs.cpSync(source+'/node_modules/'+entry,payload+'/node_modules/'+entry,{recursive:true});
  }
  function modes(d){fs.chmodSync(d,0o755);for(const n of fs.readdirSync(d)){const p=d+'/'+n,st=fs.lstatSync(p);if(st.isDirectory())modes(p);else{assert(st.isFile(),'Unexpected dependency symlink');fs.chmodSync(p,st.mode&0o111?0o755:0o644);}}}modes(payload);
  const targets=Object.keys(s.before);assert(targets.every(p=>new RegExp('^/[A-Za-z0-9_@+./-]+/'+packageName+'$').test(p)&&!p.includes('/../')));
  let recipe='FROM '+s.base+'\nUSER 0\n';for(const target of targets)recipe+='RUN rm -r '+target+'\nCOPY payload/ '+target+'/\n';recipe+='USER '+(old.User||'0')+'\n';fs.writeFileSync(work+'/Dockerfile',recipe);
  const log=run('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});fs.writeFileSync(dir+'/build.log',log);
  const imageId=docker(['image','inspect','--format','{{.Id}}',s.candidate]),next=config(imageId);assert.deepEqual({...next,User:next.User||'0'},{...old,User:old.User||'0'});
  const after=JSON.parse(node(imageId,fileManifest,[JSON.stringify(s.roots)])),allowed=p=>targets.some(t=>p.startsWith(t+'/')),changed=[];
  for(const p of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[p])!==JSON.stringify(after[p])){assert(allowed(p),'Unexpected file change '+p);changed.push(p);}assert(changed.length>0);
  const versions=JSON.parse(node(imageId,'const fs=require("fs");console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+"/package.json")).version]))))',[JSON.stringify(targets)]));assert(Object.values(versions).every(v=>v===bundle.version));
  fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),imageId,versions,configurationUnchanged:true,unchangedOtherAppFiles:Object.keys(before).filter(p=>!allowed(p)).length,changedFiles:changed.length,manifestBefore:sha(JSON.stringify(before)),manifestAfter:sha(JSON.stringify(after)),dependencyLockSha256:bundle.lockSha256,dependencyPackages:Object.keys(tree.packages).length-1,passed:true,deployed:false},null,2)+'\n');fs.writeFileSync(dir+'/changed-files.json',JSON.stringify(changed,null,2)+'\n');fs.writeFileSync(dir+'/Dockerfile',recipe);console.log(key+': scoped locked dependency tree built');
 }finally{fs.rmSync(work,{recursive:true});}
}

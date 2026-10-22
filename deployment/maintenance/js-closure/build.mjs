// Exact, reviewed runtime package replacement. Never run an npm install script.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {specs,packages,output} from './specs.mjs';
process.umask(0o077);
export async function buildExactPackages(specs,packages,output,selected){
assert(selected.length&&selected.every(k=>specs.some(s=>s.key===k)));
const hash=b=>createHash('sha256').update(b).digest('hex');
const free=()=>{const f=fs.statfsSync('/');return f.bavail*f.bsize;};
const manifest=`const fs=require('fs'),path=require('path'),crypto=require('crypto');const out={};function walk(d){for(const n of fs.readdirSync(d).sort()){const p=path.join(d,n),s=fs.lstatSync(p);if(s.isDirectory())walk(p);else if(s.isFile())out[p]={sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),mode:s.mode&511};else if(s.isSymbolicLink())out[p]={link:fs.readlinkSync(p)};}}JSON.parse(process.argv[2]).forEach(walk);console.log(JSON.stringify(out));`;
for(const key of selected){
 const s=specs.find(s=>s.key===key),dir=output+'/'+key;fs.mkdirSync(dir,{recursive:true});
 const scratch=fs.mkdtempSync('/dev/shm/utilibre-js-closure-');
 const run=(cmd,args,opts={})=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:240000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Exact candidate failed: '+dir+'/error.log');}};
 const docker=(args,opts)=>run('docker',args,opts);
 const config=id=>JSON.parse(docker(['image','inspect',id]))[0];
 // Some immutable application files are owned by the runtime UID with mode
 // 0600. Read their hashes in this networkless, read-only, no-volume inspector;
 // never grant this capability to production or a dependency test container.
 const node=(id,code,args=[])=>docker(['run','--rm','-i','--user','0','--network','none','--read-only','--cpus','2','--memory','2g','--memory-swap','2g','--pids-limit','128','--log-driver','none','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--entrypoint','node',id,'-',...args],{input:code});
 try{
  assert(free()>8.3*1024**3,'Recovery floor');
  assert.equal(docker(['inspect','--format','{{.Image}}',s.container]).trim(),s.base,'Live base changed');
  const before=JSON.parse(node(s.base,manifest,[JSON.stringify(s.roots)])),old=config(s.base),receipts=[];
  const targets=Object.values(s.paths).flat();assert(targets.every(p=>/^\/[A-Za-z0-9_@+./-]+$/.test(p)&&!p.includes('/../')));
  let recipe='FROM '+s.base+'\nUSER 0\n';
  // Deleting only the exact dependency directories is required for major packages
  // which no longer ship old lib/ files. No retained node_modules can be discarded.
  for(const target of targets){assert(!Object.keys(before).some(p=>p.startsWith(target+'/node_modules/')),'Unexpected nested dependency');recipe+='RUN rm -r '+JSON.stringify(target)+'\n';}
  for(const [name,paths] of Object.entries(s.paths)){
   const pin=packages[name],response=await fetch('https://registry.npmjs.org/'+encodeURIComponent(name)+'/'+pin.version);assert(response.ok);const meta=await response.json();assert.equal(meta.dist.integrity,pin.integrity);assert.equal(meta.name,name);assert.equal(meta.version,pin.version);
   // DOMPurify's only dependency is a TypeScript declaration package, not
   // runtime code. This finite exception must not authorize new transitives.
   const expectedDependencies=name==='dompurify'&&pin.version==='3.4.17'?{'@types/trusted-types':'^2.0.7'}:{};
   assert.deepEqual(meta.dependencies||{},expectedDependencies);assert.equal(new URL(meta.dist.tarball).hostname,'registry.npmjs.org');
   const response2=await fetch(meta.dist.tarball);assert(response2.ok);const bytes=Buffer.from(await response2.arrayBuffer());assert(bytes.length<4*1024**2);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),pin.integrity);
   const i=receipts.length,archive=scratch+'/'+i+'.tgz',dest=scratch+'/pkg'+i;fs.mkdirSync(dest,{mode:0o755});fs.writeFileSync(archive,bytes);
   const listing=run('tar',['-tzf',archive]).trim().split('\n');assert(listing.every(n=>n.startsWith('package/')&&!n.split('/').includes('..')));
   run('tar',['--no-same-owner','-xzf',archive,'--strip-components=1','-C',dest]);
   function normalize(d){fs.chmodSync(d,0o755);for(const n of fs.readdirSync(d)){const p=d+'/'+n,st=fs.lstatSync(p);if(st.isDirectory())normalize(p);else{assert(st.isFile(),'Unexpected package symlink');fs.chmodSync(p,st.mode&0o111?0o755:0o644)}}}normalize(dest);
   for(const target of paths)recipe+='COPY pkg'+i+'/ '+target+'/\n';
   receipts.push({name,...pin,paths,tarball:meta.dist.tarball,archiveSha256:hash(bytes),downloadBytes:bytes.length,license:meta.license});
  }
  const npmPolicy='/usr/local/lib/node_modules/npm/npmrc';
  if(s.disableNpmBackgroundChecks){
   const existing=node(s.base,`const fs=require('fs');if(fs.existsSync(process.argv[2]))process.stdout.write(fs.readFileSync(process.argv[2],'utf8'));`,[npmPolicy]);
   fs.writeFileSync(scratch+'/npmrc',existing+'\nupdate-notifier=false\naudit=false\nfund=false\n',{mode:0o644});fs.chmodSync(scratch+'/npmrc',0o644);recipe+='COPY npmrc '+npmPolicy+'\n';
  }
  const adapter='/grist/_build/app/server/lib/ActiveDoc.js';
  if(key==='grist'){
   let text=node(s.base,`process.stdout.write(require('fs').readFileSync(process.argv[2],'utf8'))`,[adapter]);
   const replacements=[['const image_size_1 = __importDefault(require("image-size"));','const image_size_1 = require("image-size/fromFile");'],['dimensions = await bluebird.fromCallback((cb) => (0, image_size_1.default)(fileData.absPath, cb));','dimensions = await (0, image_size_1.imageSizeFromFile)(fileData.absPath);']];
   for(const [a,b] of replacements){assert.equal(text.split(a).length,2,'Compiled adapter drift');text=text.replace(a,b)}
   fs.writeFileSync(scratch+'/ActiveDoc.js',text,{mode:0o644});fs.chmodSync(scratch+'/ActiveDoc.js',0o644);recipe+='COPY ActiveDoc.js '+adapter+'\n';
  }
  recipe+='USER '+JSON.stringify(old.Config.User||'0')+'\n';fs.writeFileSync(scratch+'/Dockerfile',recipe);
  const log=fs.openSync(dir+'/build.log','w'),child=cp.spawn('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','200000','-t',s.candidate,scratch],{env:{...process.env,DOCKER_BUILDKIT:'0'},stdio:['ignore',log,log]});
  const watcher=setInterval(()=>{if(free()<8*1024**3)child.kill('SIGTERM')},500);const code=await new Promise(r=>child.once('exit',r));clearInterval(watcher);fs.closeSync(log);assert.equal(code,0);
  const next=config(s.candidate);for(const k of ['Env','Entrypoint','Cmd','WorkingDir','Healthcheck','Volumes','ExposedPorts','Labels'])assert.deepEqual(next.Config[k],old.Config[k],k);assert.equal(next.Config.User,old.Config.User||'0');
  const after=JSON.parse(node(next.Id,manifest,[JSON.stringify(s.roots)])),allowed=p=>targets.some(t=>p.startsWith(t+'/'))||(key==='grist'&&p===adapter)||(s.disableNpmBackgroundChecks&&p===npmPolicy),changed=[];
  for(const p of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[p])!==JSON.stringify(after[p])){assert(allowed(p),'Unrelated file changed: '+p);changed.push(p)}assert(changed.length);
  const versions=JSON.parse(node(next.Id,`const fs=require('fs');console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+'/package.json')).version]))))`,[JSON.stringify(targets)]));
  for(const [name,paths] of Object.entries(s.paths))for(const p of paths)assert.equal(versions[p],packages[name].version);
  const result={...s,date:new Date().toISOString(),imageId:next.Id,packages:receipts,versions,configurationUnchanged:true,unchangedOtherAppFiles:Object.keys(before).filter(p=>!allowed(p)).length,changedFiles:changed.length,manifestBefore:hash(JSON.stringify(before)),manifestAfter:hash(JSON.stringify(after)),adapter:key==='grist'?'Two-line native attachment image metadata Promise adaptation':null,passed:true,deployed:false};
  fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2)+'\n');fs.writeFileSync(dir+'/changed-files.json',JSON.stringify(changed,null,2)+'\n');fs.writeFileSync(dir+'/Dockerfile',recipe);console.log(JSON.stringify({key,imageId:next.Id,passed:true}));
 }finally{fs.rmSync(scratch,{recursive:true,force:true})}
}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await buildExactPackages(specs,packages,output,process.argv.slice(2));

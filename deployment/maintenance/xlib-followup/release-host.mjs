// Four native host libraries only; guarded preparation by default, explicit apply.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {exportedSymbols} from '../bookworm-curl-followup/policy.mjs';
import {simulationGate} from './policy.mjs';
process.umask(0o077);assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname,dir=root+'/host';
const packages=['libx11-6','libx11-data','libx11-xcb1','libxrender1'];
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();
const acquisition=read(dir+'/acquisition.json'),source=read(root+'/source-checks.json');assert(source.passed);
const temp=fs.mkdtempSync('/tmp/utilibre-xlib-host-');fs.chmodSync(temp,0o755);
const manifest=base=>fs.readdirSync(base,{recursive:true}).map(file=>{const p=base+'/'+file,s=fs.lstatSync(p);return s.isFile()?{file:'/'+file,sha256:sha(p),mode:s.mode&0o7777}:s.isSymbolicLink()?{file:'/'+file,link:fs.readlinkSync(p),mode:s.mode&0o7777}:null;}).filter(Boolean).sort((a,b)=>a.file.localeCompare(b.file));
const exact=(rows,base='')=>{for(const r of rows){const p=base+r.file,s=fs.lstatSync(p);assert.equal(s.mode&0o7777,r.mode,r.file);if(r.link!==undefined){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(p),r.link);}else{assert(s.isFile());assert.equal(sha(p),r.sha256,r.file);}}};
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!packages.some(p=>l.startsWith(p+'=')||l.startsWith(p+':amd64='))).sort();
const pids=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const noResident=()=>{for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){try{const cgroup=fs.readFileSync('/proc/'+pid+'/cgroup','utf8');if(cgroup.includes('docker'))continue;assert(!/\/(?:libX11(?:-xcb)?|libXrender)\.so/.test(fs.readFileSync('/proc/'+pid+'/maps','utf8')),'Host X library consumer active; an explicit refresh plan is required');}catch(e){if(['ENOENT','ESRCH'].includes(e.code))continue;throw e;}}};
try{
 assert.equal(run('dpkg',['--audit']),'');noResident();assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);assert(!fs.existsSync(dir+'/release.json'),'Do not overwrite release evidence');
 const oldPackages={},newPackages={},archives=[];
 for(const name of packages){
  const old=acquisition.records.find(r=>r.name===name),candidate=source.packages.find(p=>p.suite==='trixie'&&p.file.startsWith(name+'_'));assert(old&&candidate);
  assert.equal(run('dpkg-query',['-W','-f=${Version}',name]),old.version);
  const oldFile=dir+'/archives/'+old.file,newFile=root+'/build/trixie/trixie/'+candidate.file;
  assert.equal(sha(oldFile),old.sha256);assert.equal(sha(newFile),candidate.sha256);
  assert.equal(run('dpkg-deb',['-f',newFile,'Version']),old.version+'+utilibre1');
  for(const [kind,file]of [['old',oldFile],['new',newFile]])run('dpkg-deb',['-x',file,temp+'/'+kind]);
  oldPackages[name]=oldFile;newPackages[name]=newFile;archives.push({name,oldVersion:old.version,newVersion:old.version+'+utilibre1',oldSha256:old.sha256,newSha256:candidate.sha256});
 }
 const oldFiles=manifest(temp+'/old'),newFiles=manifest(temp+'/new');exact(oldFiles);assert.deepEqual(oldFiles.map(r=>r.file),newFiles.map(r=>r.file));
 const abi=[];
 for(const lib of ['libX11.so.6','libX11-xcb.so.1','libXrender.so.1']){
  const rel='/usr/lib/x86_64-linux-gnu/'+lib,old=temp+'/old'+rel,next=temp+'/new'+rel;
  const before=exportedSymbols(run('readelf',['--dyn-syms','--wide',old])),after=exportedSymbols(run('readelf',['--dyn-syms','--wide',next]));assert(before.size);for(const s of before)assert(after.has(s),'Lost ABI '+s);
  const deps=f=>[...run('readelf',['-d',f]).matchAll(/\((NEEDED|SONAME)\).*\[([^\]]+)\]/g)].map(m=>m[1]+':'+m[2]).sort();assert.deepEqual(deps(old),deps(next));assert(!run('ldd',[next]).includes('not found'));abi.push({path:rel,oldSha256:sha(old),newSha256:sha(next),preservedSymbols:before.size});
 }
 const simulation=run('apt-get',['--simulate','install',...Object.values(newPackages)]);simulationGate(simulation);
 const otherInventory=inventory(),originalPids=pids();
 const otherFiles=['/etc/X11','/etc/apt/sources.list.d'].filter(fs.existsSync).flatMap(base=>manifest(base).map(r=>({...r,file:base+r.file}))).filter(r=>!oldFiles.some(x=>x.file===r.file));
 const helpers=acquisition.records.filter(r=>!packages.includes(r.name));
 for(const h of helpers){assert.equal(sha(dir+'/archives/'+h.file),h.sha256);run('dpkg-deb',['-x',dir+'/archives/'+h.file,temp+'/diagnostics']);}
 fs.copyFileSync(process.execPath,temp+'/node');fs.chmodSync(temp+'/node',0o755);fs.copyFileSync(here+'native-host.mjs',temp+'/native-host.mjs');fs.chmodSync(temp+'/native-host.mjs',0o644);
 const libraries=kind=>(kind==='live'?'':temp+'/'+kind+'/usr/lib/x86_64-linux-gnu:')+temp+'/diagnostics/usr/lib/x86_64-linux-gnu';
 const native=kind=>{
  const area=fs.mkdtempSync(temp+'/fixture-');fs.chownSync(area,65534,65534);fs.chmodSync(area,0o700);fs.symlinkSync(temp+'/diagnostics',area+'/diagnostics');const out=area+'/result.json';
  run('unshare',['--net','prlimit','--core=0','--','runuser','-u','nobody','--',temp+'/node',temp+'/native-host.mjs',area,libraries(kind),out]);const result=read(out);assert(result.passed&&result.nativeDisplay&&result.renderExtension);delete result.libraries;return result;
 };
 const libc=run('dpkg-query',['-W','-f=${Version}','libc6']);
 const preserved=()=>{assert.deepEqual(inventory(),otherInventory);assert.equal(pids(),originalPids);exact(otherFiles);assert.equal(run('dpkg',['--audit']),'');noResident();};
 const common={archives,oldFiles,newFiles,abi,libcVersion:libc,sourceProofSha256:sha(root+'/source-checks.json'),helpers:helpers.map(({index,...r})=>r),recipeHashes:Object.fromEntries(['native-host.mjs','release-host.mjs','acquire-host.mjs','policy.mjs'].map(f=>[f,sha(here+f)])),otherInventorySha256:createHash('sha256').update(JSON.stringify(otherInventory)).digest('hex'),preservedFiles:otherFiles};
 if(process.argv[2]!=='--apply'){
  const report={date:new Date().toISOString(),...common,baseline:native('old'),candidate:native('new'),simulation,networkIsolated:true,unprivileged:true,passed:true};preserved();fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'prepared',packages,payloadFiles:newFiles.length,preservedHostFiles:otherFiles.length,abiLibraries:abi.length,nativeRenderPassed:true,productionChanged:false}));
 }else{
  const proof=read(dir+'/checks.json');assert(proof.passed&&proof.networkIsolated&&proof.unprivileged);assert(Date.now()-Date.parse(proof.date)<1800000);for(const [k,v]of Object.entries(common))assert.deepEqual(proof[k],v,'Preparation changed '+k);assert(proof.baseline.passed&&proof.candidate.passed);preserved();
  const receipt={date:new Date().toISOString(),status:'prepared',...common,checksSha256:sha(dir+'/checks.json')},save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(receipt,null,2)+'\n');save();
  try{
   run('dpkg',['--install',...Object.values(newPackages)]);exact(newFiles);for(const a of archives)assert.equal(run('dpkg-query',['-W','-f=${Version}',a.name]),a.newVersion);receipt.native=native('live');preserved();
   run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);const blacklist=fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8');for(const p of packages)assert(blacklist.includes(p.replaceAll('-','[-]')),'Missing unattended protection');
   receipt.status='passed';receipt.completedAt=new Date().toISOString();receipt.noServiceRestart=true;save();
  }catch(e){receipt.status='failed';receipt.error=e.message;try{run('dpkg',['--install',...Object.values(oldPackages)]);exact(oldFiles);preserved();receipt.rollback='Exact original four packages restored';}catch{receipt.rollback='NOT VERIFIED';}save();throw Error('Host Xlib release failed; inspect private receipt');}
  console.log(JSON.stringify({status:'passed',packages,noServiceRestart:true}));
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-xlib-host-'));fs.rmSync(temp,{recursive:true});}

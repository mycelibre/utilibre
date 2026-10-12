// Host-only signed Xvfb pair. No distro upgrade, production display or service restart.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {previous,current,packages,pins,binary,fixes,simulationGate,nativeGate} from './host-policy.mjs';
process.umask(0o077);
assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const dir='/var/lib/utilibre-maintenance/xserver-followup-20261012',here=new URL('.',import.meta.url).pathname;
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:12*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){throw Error(path.basename(p)+' failed: '+String(e.stderr||e.message).slice(-2000));}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const deb=(p,kind)=>`${dir}/packages/${p}_${(kind==='old'?previous:current).replace(':','%3a')}_${pins[p].architecture}.deb`;
const temp=fs.mkdtempSync('/tmp/utilibre-xserver-release-');fs.chmodSync(temp,0o755);
const manifest=base=>fs.readdirSync(base,{recursive:true}).map(name=>{const f=base+'/'+name,s=fs.lstatSync(f);return s.isFile()?{file:'/'+name,sha256:sha(f),mode:s.mode&0o7777}:s.isSymbolicLink()?{file:'/'+name,link:fs.readlinkSync(f),mode:s.mode&0o7777}:null;}).filter(Boolean).sort((a,b)=>a.file.localeCompare(b.file));
const exact=(rows,base='')=>{for(const row of rows){const p=base+row.file,s=fs.lstatSync(p);assert.equal(s.mode&0o7777,row.mode,'Mode '+row.file);if(row.link!==undefined){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(p),row.link);}else{assert(s.isFile());assert.equal(sha(p),row.sha256,'Payload '+row.file);}}};
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!packages.some(p=>l.startsWith(p+'='))).sort();
const pids=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const noHostDisplay=()=>{for(const n of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{const comm=fs.readFileSync('/proc/'+n+'/comm','utf8').trim(),group=fs.readFileSync('/proc/'+n+'/cgroup','utf8');assert(comm!=='Xvfb'||group.includes('docker'),'A host Xvfb is active; an explicit consumer restart plan is required');}catch(e){if(e.code==='ENOENT'||e.code==='ESRCH')continue;throw e;}}};
try{
 assert.equal(run('dpkg',['--audit']),'');noHostDisplay();assert(Number(run('df',['-B1','--output=avail','/']).split('\n').at(-1))>=8589934592);
 assert(!fs.existsSync(dir+'/host-release.json'),'Never overwrite a completed release receipt');
 const versions=()=>Object.fromEntries(packages.map(p=>[p,run('dpkg-query',['-W','-f=${Version}',p])]));
 assert.deepEqual(versions(),Object.fromEntries(packages.map(p=>[p,previous])));
 const packageInventory=inventory(),originalPids=pids();
 const aptArgs=['-o','Dir::Etc::sourcelist='+here+'review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+dir+'/apt-lists','-o','Dir::Cache='+dir+'/cache'];
 const oldIndex=run('apt-cache',[...aptArgs,'show',...packages.map(p=>p+'='+previous)]);
 const index=fs.readFileSync(dir+'/package-index.txt','utf8')+'\n\n'+oldIndex;
 const archives=[];
 for(const kind of ['old','new'])for(const p of packages){
  const f=deb(p,kind),v=kind==='old'?previous:current;assert.equal(sha(f),pins[p][kind]);
  assert(index.split(/\n\n+/).some(b=>b.startsWith('Package: '+p+'\n')&&b.includes('\nVersion: '+v+'\n')&&b.includes('\nSHA256: '+pins[p][kind])),'Authenticated APT archive checksum missing');
  assert.equal(run('dpkg-deb',['-f',f,'Package']),p);assert.equal(run('dpkg-deb',['-f',f,'Version']),v);
  const entries=run('tar',['-tf','-'],{input:cp.execFileSync('dpkg-deb',['--ctrl-tarfile',f]),stdio:['pipe','pipe','pipe']}).split('\n');
  assert(entries.every(n=>['./','./control','./md5sums'].includes(n)),'Unexpected maintainer script or package control side effect');
  run('dpkg-deb',['-x',f,temp+'/'+kind]);archives.push({package:p,version:v,sha256:pins[p][kind]});
 }
 const oldFiles=manifest(temp+'/old'),newFiles=manifest(temp+'/new');exact(oldFiles);
 assert.deepEqual(oldFiles.map(f=>f.file),newFiles.map(f=>f.file),'No new/removed paths expected');
 assert.equal(sha('/usr/bin/Xvfb'),binary.old);assert.equal(sha(temp+'/new/usr/bin/Xvfb'),binary.new);
 const stage=read(dir+'/stage.json');assert.equal(stage.version,current);
 const sourceIndex=fs.readFileSync(dir+'/source-index.txt','utf8').split(/\n\n+/).find(b=>/^Version: 2:21\.1\.25-1$/m.test(b));assert(sourceIndex);
 for(const archive of stage.sourceArchives){assert.equal(sha(dir+'/sources/'+archive.file),archive.sha256);assert(sourceIndex.includes(archive.sha256+' '+archive.bytes+' '+archive.file));}
 run('dpkg-source',['-x',dir+'/sources/xorg-server_21.1.25-1.dsc',temp+'/source']);
 for(const [id,fix]of Object.entries(fixes)){assert.equal(sha(dir+'/'+id+'.patch'),fix.sha256);assert(fs.readFileSync(dir+'/'+id+'.patch','utf8').startsWith('From '+fix.commit+' '));run('patch',['-p1','--batch','--reverse','--dry-run','-i',dir+'/'+id+'.patch'],{cwd:temp+'/source'});}
 const simulation=run('apt-get',['--simulate','install',...packages.map(p=>deb(p,'new'))]);simulationGate(simulation);
 const dependencies=run('ldd',[temp+'/new/usr/bin/Xvfb']);assert(!dependencies.includes('not found'));
 const dependencyBytes=Object.fromEntries([...new Set(dependencies.match(/\/[\w./+-]+(?=\s+\()/g))].map(p=>[p,sha(p)]));assert(Object.keys(dependencyBytes).length>10);
 const preservedDirs=['/etc/X11','/etc/apt/sources.list.d','/var/lib/xkb'];
 const otherFiles=preservedDirs.filter(fs.existsSync).flatMap(base=>manifest(base).map(r=>({...r,file:base+r.file}))).filter(r=>!oldFiles.some(o=>o.file===r.file));
 const recipes=['native.mjs','host-policy.mjs','release-host.mjs','review.sources'].map(file=>({file,sha256:sha(here+file)}));
 fs.copyFileSync(process.execPath,temp+'/node');fs.chmodSync(temp+'/node',0o755);fs.copyFileSync(here+'native.mjs',temp+'/native.mjs');fs.chmodSync(temp+'/native.mjs',0o644);
 const test=(kind,binaryPath)=>{
  const area=fs.mkdtempSync(temp+'/fixture-');fs.chownSync(area,65534,65534);fs.chmodSync(area,0o700);
  const result=area+'/result.json';run('unshare',['--net','prlimit','--core=0','--','runuser','-u','nobody','--','env','TMPDIR='+area,temp+'/node',temp+'/native.mjs',kind==='old'?'baseline':'candidate',binaryPath,result]);
  const proof=read(result);nativeGate(proof,kind);return proof;
 };
 const common={version:current,oldVersion:previous,archives,sourceArchives:stage.sourceArchives,fixes,oldFiles,newFiles,dependencyBytes,otherFiles,recipes,nodeSha256:sha(process.execPath),libcVersion:run('dpkg-query',['-W','-f=${Version}','libc6']),packageInventorySha256:createHash('sha256').update(JSON.stringify(packageInventory)).digest('hex')};
 const preserved=()=>{assert.deepEqual(inventory(),packageInventory);assert.equal(pids(),originalPids);exact(otherFiles);for(const [p,s]of Object.entries(dependencyBytes))assert.equal(sha(p),s);assert.equal(run('dpkg',['--audit']),'');noHostDisplay();};
 if(process.argv[2]!=='--apply'){
  const proof={date:new Date().toISOString(),...common,baseline:test('old','/usr/bin/Xvfb'),candidate:test('new',temp+'/new/usr/bin/Xvfb'),simulation,unprivileged:true,networkIsolated:true,coreDumpsDisabled:true,passed:true};preserved();
  fs.writeFileSync(dir+'/host-checks.json',JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify({status:'prepared',version:current,packages,baselineReproduced:true,candidatePassed:true,sourceFixes:Object.keys(fixes),payloadFiles:newFiles.length,dependencyFiles:Object.keys(dependencyBytes).length,otherPreservedFiles:otherFiles.length,productionChanged:false}));
 }else{
  const proof=read(dir+'/host-checks.json');assert(proof.passed&&proof.unprivileged&&proof.networkIsolated&&proof.coreDumpsDisabled);assert(Date.now()-Date.parse(proof.date)<1800000);
  for(const [k,v]of Object.entries(common))assert.deepEqual(proof[k],v,'Preparation changed: '+k);nativeGate(proof.baseline,'old');nativeGate(proof.candidate,'new');preserved();
  const report={startedAt:new Date().toISOString(),status:'prepared',...common,checksSha256:sha(dir+'/host-checks.json'),simulation};
  const save=()=>fs.writeFileSync(dir+'/host-release.json',JSON.stringify(report,null,2)+'\n');save();
  try{
   run('dpkg',['--install',...packages.map(p=>deb(p,'new'))]);assert.deepEqual(versions(),Object.fromEntries(packages.map(p=>[p,current])));exact(newFiles);
   report.live=test('new','/usr/bin/Xvfb');preserved();
   run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);
   const protectedText=fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8');assert(protectedText.includes('xvfb')&&protectedText.includes('xserver[-]common'));
   report.status='passed';report.completedAt=new Date().toISOString();report.noServiceRestart=true;save();
  }catch(error){
   report.status='failed';report.error=error.message;
   try{run('dpkg',['--install',...packages.map(p=>deb(p,'old'))]);assert.deepEqual(versions(),Object.fromEntries(packages.map(p=>[p,previous])));exact(oldFiles);preserved();report.rollback='Exact two old packages and all preserved bytes verified';}catch{report.rollback='NOT VERIFIED';}
   save();throw Error('Host Xvfb release failed; inspect private receipt before further work');
  }
  console.log(JSON.stringify({status:report.status,version:current,packages,noServiceRestart:true,live:report.live,protectedFromUnattendedReplacement:true}));
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-xserver-release-'));fs.rmSync(temp,{recursive:true});}

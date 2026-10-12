// Native stable package repair; exact family only, signed local rollback first.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',build=dir+'/util-linux-trixie';
const reportFile=dir+'/util-linux-host.json',version='2.41.5-0+deb13u1+utilibre2';
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive',NEEDRESTART_MODE:'l'},...o}).trim();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const installed=()=>run('dpkg-query',['-W','-f=${Package}\t${Version}\t${source:Package}\t${source:Version}\t${db:Status-Status}\n']).split('\n').filter(l=>l.includes('\tutil-linux\t')&&l.endsWith('\tinstalled')).map(l=>{const [name,binaryVersion,,sourceVersion]=l.split('\t');return {name,binaryVersion,sourceVersion};});
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
const debs=new Map(fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb')).map(f=>[run('dpkg-deb',['-f',build+'/'+f,'Package']),build+'/'+f]));
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').pop(),l.slice(0,64)]));
const services=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--value','--property','MainPID',s])]));
const exports=p=>new Set(run('readelf',['--dyn-syms','--wide',p]).split('\n').map(l=>l.trim().split(/\s+/)).filter(v=>['GLOBAL','WEAK'].includes(v[4])&&v[5]==='DEFAULT'&&v[6]!=='UND').map(v=>v[3]+':'+v[7].replace('@@','@')));
const conffiles=names=>run('dpkg-query',['-W','-f=${Conffiles}\n',...names]).split('\n').map(l=>l.trim().split(/\s+/)[0]).filter(p=>p.startsWith('/')&&fs.existsSync(p)).sort().map(p=>[p,sha(p)]);
const simulate=files=>{const output=run('apt-get',['--simulate','--no-install-recommends','install',...files]);assert(!/^Remv /m.test(output));const names=output.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]);assert.deepEqual(names.sort(),installed().map(p=>p.name).sort());return digest(output);};
const save=r=>fs.writeFileSync(reportFile,JSON.stringify(r,null,2)+'\n');
if(mode==='prepare'){
 assert(!fs.existsSync(reportFile));assert.equal(run('dpkg',['--audit']),'');
 const proof=JSON.parse(fs.readFileSync(dir+'/util-linux/util-linux-calendar-radicale/native.json'));assert(proof.passed&&proof.nativeMountFailureAndSuccess&&proof.simulatedCgroupDescriptorClosed&&proof.abiPreserved);
 assert(Date.now()-Date.parse(proof.date)<86400000);assert(fs.readFileSync(build+'/runner.log','utf8').includes('NATIVE_UTIL_LINUX_BUILD_PASSED'));
 const old=installed();assert.equal(old.length,14);assert(old.every(p=>p.sourceVersion==='2.41.5-0+deb13u1'));
 const rollbackDir=dir+'/rollback/util-linux';fs.mkdirSync(rollbackDir,{recursive:true});
 const apt=['-o','Dir::Etc::sourcelist=/home/ubuntu/freetools/deployment/maintenance/closure-followup/review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+dir+'/apt-lists'];
 run('apt-get',[...apt,'download',...old.map(p=>p.name+'='+p.binaryVersion)],{cwd:rollbackDir});
 const rows=old.map(p=>{
  const next=debs.get(p.name);assert(next);assert.equal(sha(next),sums.get(next.split('/').pop()));
  const sourceField=run('dpkg-deb',['-f',next,'Source'])||run('dpkg-deb',['-f',next,'Package']);
  assert(['util-linux',`util-linux (${version})`].includes(sourceField));
  assert.equal(sourceField==='util-linux'?run('dpkg-deb',['-f',next,'Version']):sourceField.slice(12,-1),version);
  const prior=fs.readdirSync(rollbackDir).filter(f=>f.endsWith('.deb')).map(f=>rollbackDir+'/'+f).find(f=>run('dpkg-deb',['-f',f,'Package'])===p.name);assert(prior);
  assert.equal(run('dpkg-deb',['-f',prior,'Version']),p.binaryVersion);
  const metadata=run('apt-cache',[...apt,'show',p.name+'='+p.binaryVersion]);assert(metadata.includes('SHA256: '+sha(prior)));
  return {...p,next,nextSha256:sha(next),prior,priorSha256:sha(prior)};
 });
 const temp=fs.mkdtempSync('/dev/shm/utilibre-host-utils-'),abi=[];
 try{
  for(const row of rows.filter(p=>p.name.startsWith('lib')))run('dpkg-deb',['-x',row.next,temp]);
  for(const lib of ['libmount.so.1','libblkid.so.1','libuuid.so.1','libsmartcols.so.1','liblastlog2.so.2','libfdisk.so.1']){
   const file='/usr/lib/x86_64-linux-gnu/'+lib,oldSymbols=exports(file),nextSymbols=exports(temp+file);assert(oldSymbols.size>0);for(const s of oldSymbols)assert(nextSymbols.has(s));abi.push({file,oldSha256:sha(file),nextSha256:sha(temp+file),preservedSymbols:oldSymbols.size});
  }
 }finally{fs.rmSync(temp,{recursive:true});}
 const simulationSha256=simulate(rows.map(p=>p.next));
 save({date:new Date().toISOString(),status:'prepared',version,rows,abi,simulationSha256,conffilesSha256:digest(conffiles(old.map(p=>p.name))),servicePids:services(),libcSha256:sha('/usr/lib/x86_64-linux-gnu/libc.so.6')});
 console.log('Host: 14 native packages prepared; six library ABIs preserved; signed rollback retained.');
}else{
 const r=JSON.parse(fs.readFileSync(reportFile));assert.equal(r.status,'prepared');assert(Date.now()-Date.parse(r.date)<86400000);
 assert.deepEqual(installed(),r.rows.map(({name,binaryVersion,sourceVersion})=>({name,binaryVersion,sourceVersion})));assert.deepEqual(services(),r.servicePids);
 for(const row of r.rows){assert.equal(sha(row.next),row.nextSha256);assert.equal(sha(row.prior),row.priorSha256);}
 simulate(r.rows.map(p=>p.next));assert.equal(digest(conffiles(r.rows.map(p=>p.name))),r.conffilesSha256);
 r.status='applying';save(r);
 try{
  // Resolve already-validated local file paths through APT's acquisition step.
  // --no-download mis-resolves epoch-bearing local archive names on this APT.
  // The exact-family simulation above excludes any additional package fetch.
  run('apt-get',['--yes','--no-install-recommends','-o','Dpkg::Options::=--force-confold','install',...r.rows.map(p=>p.next)]);
  assert.equal(run('dpkg',['--audit']),'');assert(installed().every(p=>p.sourceVersion===version));
  assert.equal(digest(conffiles(r.rows.map(p=>p.name))),r.conffilesSha256);assert.equal(sha('/usr/lib/x86_64-linux-gnu/libc.so.6'),r.libcSha256);assert.deepEqual(services(),r.servicePids);
  for(const a of r.abi){assert.equal(sha(a.file),a.nextSha256);assert(!/not found|undefined symbol/.test(run('ldd',['-r',a.file])));}
  assert(run('findmnt',['--noheadings','--output','TARGET','/']).includes('/'));assert(run('lsblk',['--noheadings','--output','NAME']).length>0);
  assert.match(run('uuidgen',[]),/^[a-f0-9-]{36}$/);assert.equal(run('setpriv',['--no-new-privs','true']),'');
  r.status='passed';r.nativeReadOnlyChecks=true;r.configurationLibcAndServicePidsUnchanged=true;
 }catch(error){
  fs.writeFileSync(dir+'/util-linux-host-error.log',String(error.stdout||'')+String(error.stderr||error));
  r.status='failed';r.failure=error.message.slice(0,180);save(r);
  run('apt-get',['--yes','--allow-downgrades','--no-install-recommends','-o','Dpkg::Options::=--force-confold','install',...r.rows.map(p=>p.prior)]);
  assert.equal(run('dpkg',['--audit']),'');r.rollback='Original signed 14-package family restored';save(r);throw Error('Host utility release failed; original signed packages restored.');
 }
 r.completedAt=new Date().toISOString();save(r);console.log('Host utility family patched; native read-only checks, libc, configuration and Docker/SSH PID checks passed.');
}

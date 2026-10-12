// Native stable cryptography package only: no pip, dependency upgrades or restarts.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const dir='/var/lib/utilibre-maintenance/host-cryptography-followup-20261012',here=new URL('.',import.meta.url).pathname;
const old='43.0.0-3+deb13u1',next=old+'+utilibre1',pkg='python3-cryptography';
const lib='/usr/lib/python3/dist-packages',rust=lib+'/cryptography/hazmat/bindings/_rust.abi3.so';
const before=dir+'/sources/'+pkg+'_'+old+'_amd64.deb',candidate=dir+'/build/'+pkg+'_'+next+'_amd64.deb';
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){throw Error(path.basename(p)+' failed: '+String(e.stderr||'').slice(-2500));}};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
run('node',[here+'verify-source.mjs']);
const sourceArchive=dir+'/build/python-cryptography_'+next+'.debian.tar.xz';
const archived=file=>cp.execFileSync('tar',['-xOf',sourceArchive,file],{timeout:30000,maxBuffer:1024**2});
assert.equal(createHash('sha256').update(archived('debian/patches/utilibre-verification-budget.patch')).digest('hex'),'73c1bab19c17e9d0b45cf4d2f4d5f2c202cae72c48ad3f016bc1749c447fe5af');
assert.equal(createHash('sha256').update(archived('debian/patches/utilibre-vendor-test-compat.patch')).digest('hex'),sha(here+'vendor-test-compat.patch'));
const sums=new Map(fs.readFileSync(dir+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
assert.equal(sha(candidate),sums.get(path.basename(candidate)));
assert.match(fs.readFileSync(dir+'/build/runner.log','utf8'),/NATIVE_STABLE_CRYPTOGRAPHY_BUILD_PASSED/);
const rustTests=fs.readFileSync(dir+'/build/rust-tests.log','utf8');
assert.match(rustTests,/test result: ok\./);assert.match(rustTests,/test_build_chain_inner_depth_overflow .*ok/);
assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),old);
assert.equal(run('dpkg',['--audit']),'');
assert(Number(run('df',['-B1','--output=avail','/']).split('\n').at(-1))>=8589934592);
assert(!fs.existsSync(dir+'/release.json'),'Never overwrite a completed receipt');
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!l.startsWith(pkg+'=')).sort();
const pids=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const oldPids=pids(),packages=inventory();
const simulation=run('apt-get',['--simulate','install',candidate]);
assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),[pkg]);
assert(!simulation.split('\n').some(l=>l.startsWith('Remv ')));
const temp=fs.mkdtempSync('/tmp/utilibre-cryptography-stage-');fs.chmodSync(temp,0o755);
const manifest=base=>{const rows=[];for(const name of fs.readdirSync(base,{recursive:true})){const p=base+'/'+name;if(fs.statSync(p).isFile()&&!name.includes('__pycache__'))rows.push([name,sha(p)]);}return rows.sort((a,b)=>a[0].localeCompare(b[0]));};
const checks=()=>['check.py','verify-source.mjs','inner.sh','vendor-test-compat.patch','release.mjs'].map(f=>({file:f,sha256:sha(here+f)}));
try{
 run('dpkg-deb',['-x',before,temp+'/old']);run('dpkg-deb',['-x',candidate,temp+'/new']);
 assert.equal(sha(temp+'/old'+rust),sha(rust),'Live original Rust artifact differs from authenticated rollback');
 const oldFiles=manifest(temp+'/old'+lib+'/cryptography'),newFiles=manifest(temp+'/new'+lib+'/cryptography');
 for(const [file,hash]of oldFiles)assert.equal(sha(lib+'/cryptography/'+file),hash,'Installed baseline package file differs: '+file);
 assert.deepEqual(oldFiles.map(x=>x[0]),newFiles.map(x=>x[0]));
 const changed=oldFiles.filter((x,i)=>x[1]!==newFiles[i][1]).map(x=>x[0]);
 assert.deepEqual(changed,['hazmat/bindings/_rust.abi3.so'],'Stable Python API files must remain byte-identical');
 const test=(where,mode)=>JSON.parse(run('unshare',['--net','sh','-c','ip link set lo up && exec runuser -u nobody -- /usr/bin/python3 -B "$1" "$2" "$3"','check',here+'check.py',where,mode]));
 const common={package:pkg,oldVersion:old,newVersion:next,oldPackageSha256:sha(before),newPackageSha256:sha(candidate),sourceArchiveSha256:sha(sourceArchive),oldRustSha256:sha(temp+'/old'+rust),newRustSha256:sha(temp+'/new'+rust),stablePythonFiles:oldFiles.length-1,changedFiles:changed,checks:checks(),buildLogSha256:sha(dir+'/build/build.log'),rustTestsSha256:sha(dir+'/build/rust-tests.log')};
 if(process.argv[2]!=='--apply'){
  const report={date:new Date().toISOString(),...common,old:test(temp+'/old'+lib,'old'),candidate:test(temp+'/new'+lib,'new'),passed:true};
  assert.equal(report.old.budgetEnforced,false);assert(report.candidate.budgetEnforced);
  fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }else{
  const proof=read(dir+'/checks.json');assert(proof.passed);assert(Date.now()-Date.parse(proof.date)<1800000);
  for(const [key,value]of Object.entries(common))assert.deepEqual(proof[key],value,'Staging proof changed: '+key);
  const report={startedAt:new Date().toISOString(),status:'prepared',...common,checksSha256:sha(dir+'/checks.json'),simulation};
  const save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');save();
  try{
   run('dpkg',['--install',candidate]);assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),next);assert.equal(sha(rust),common.newRustSha256);
   for(const [file,hash]of newFiles)assert.equal(sha(lib+'/cryptography/'+file),hash,'Installed candidate package file differs: '+file);
   report.live=test(lib,'new');assert(report.live.passed&&report.live.budgetEnforced);
   assert.equal(run('dpkg',['--audit']),'');assert.deepEqual(inventory(),packages);assert.equal(pids(),oldPids);
   run('/usr/bin/python3',[new URL('../../../scripts/maintenance-update-policy.py',import.meta.url).pathname,'--write-unattended-blacklist']);
   assert(fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8').includes('python3[-]cryptography'));
   report.status='passed';report.noServiceRestart=true;report.completedAt=new Date().toISOString();save();
  }catch(error){
   report.status='failed';report.error=error.message;
   try{run('dpkg',['--install',before]);assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),old);assert.equal(sha(rust),common.oldRustSha256);report.rollback='Exact old native package restored';}catch{report.rollback='NOT VERIFIED';}
   save();throw Error('Native cryptography release failed; inspect private receipt and rollback');
  }
  console.log(JSON.stringify({status:report.status,version:next,live:report.live,noServiceRestart:true,protectedFromUnattendedReplacement:true}));
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-cryptography-stage-'));fs.rmSync(temp,{recursive:true});}

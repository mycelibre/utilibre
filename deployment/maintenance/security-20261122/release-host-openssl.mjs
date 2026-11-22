// Four previously tested packages only. check is read-only; apply needs a fresh
// operator-confirmed console/backup window. No automatic reboot or service reload.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';

process.umask(0o077);
const here=path.dirname(fileURLToPath(import.meta.url));
const root='/var/lib/utilibre-maintenance/security-20261122', out=root+'/host-openssl';
const [mode,confirmation]=process.argv.slice(2);
assert(['check','apply','verify','rollback'].includes(mode));
assert(process.argv.length===3 || (['apply','rollback'].includes(mode)&&process.argv.length===4&&confirmation==='--maintenance-window-confirmed'));
if(['apply','rollback'].includes(mode))assert.equal(confirmation,'--maintenance-window-confirmed');
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const hash=v=>createHash('sha256').update(v).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const save=(p,v)=>{fs.writeFileSync(p+'.tmp',JSON.stringify(v,null,2)+'\n',{mode:0o600});fs.renameSync(p+'.tmp',p);};
function run(program,args,timeout=60000){
 const r=cp.spawnSync(program,args,{encoding:'utf8',timeout,maxBuffer:4*1024**2,env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C',DEBIAN_FRONTEND:'noninteractive'},stdio:['ignore','pipe','pipe']});
 if(r.status!==0){fs.writeFileSync(out+'/release-error.log',String(r.stderr||r.error||'command failed'),{mode:0o600});throw Error(path.basename(program)+' failed; private diagnostic retained');}
 return r.stdout.trim();
}
const names=['libssl3t64','openssl-provider-legacy','openssl','libssl-dev'];
const old='3.5.7-1~deb13u3',next='3.5.9-1~deb13u1+utilibre1';
const inputs=read(here+'/openssl-runtime-inputs.json'),prepared=read(out+'/prepared.json'),scan=read(out+'/scan-gate.json');
assert(prepared.passed&&prepared.rollbackPayloadMatchesHost&&prepared.onlyFourPackagesInSimulation);
assert.equal(prepared.oldVersion,old);assert.equal(prepared.newVersion,next);
assert.equal(sha(root+'/openssl-build-v2/built.json'),inputs.sourceBuildSha256);
assert.equal(prepared.sourceBuildSha256,inputs.sourceBuildSha256);
assert.equal(prepared.sourceNativeTests,4932);assert(prepared.checks.length===2&&prepared.checks.every(r=>r.passed&&r.nativeCryptoChecks===8));
assert(scan.passed&&scan.newFindings.length===0&&scan.productionChanged===false);
assert.equal(scan.preparedSha256,sha(out+'/prepared.json'));
for(const phase of ['before','after'])assert.equal(sha(out+'/'+phase+'-scan.json'),scan.scans[phase].sha256);
assert.equal(scan.databaseSha256,inputs.database.databaseSha256);
const archives=phase=>names.map(name=>{
 const row=prepared.records.find(r=>r.package===name&&r.phase===phase);assert(row);
 assert.equal(sha(row.archive),row.sha256);
 if(phase==='after')assert.equal(row.sha256,inputs.packages[name].sha256);
 return row.archive;
});
const beforeFiles=archives('before'),afterFiles=archives('after');
const currentVersion=name=>run('dpkg-query',['-W','-f=${Version}',name]);
const inventory=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']);
const others=()=>inventory().split('\n').filter(line=>!names.includes(line.split('=')[0].split(':')[0])).sort().join('\n');
const pids=()=>run('systemctl',['show','docker.service','ssh.service','qemu-guest-agent.service','dbus.service','systemd-networkd.service','-p','Id','-p','MainPID']);
const boot=()=>fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();
function mappedPredecessors(){
 const own=fs.statSync('/');let count=0;
 for(const id of fs.readdirSync('/proc').filter(n=>/^\d+$/.test(n))){
  try{
   const s=fs.statSync('/proc/'+id+'/root');if(s.dev!==own.dev||s.ino!==own.ino)continue;
   if(fs.readFileSync('/proc/'+id+'/maps','utf8').split('\n').some(l=>/\/(libcrypto|libssl)\.so\.3\s+\(deleted\)$/.test(l)))count++;
  }catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}
 }
 return count;
}
function payload(directory){
 const rows=[];
 function visit(dir){for(const name of fs.readdirSync(dir)){
  const file=path.join(dir,name),relative=file.slice(directory.length);if(relative==='/DEBIAN')continue;
  const s=fs.lstatSync(file);
  if(s.isSymbolicLink())rows.push({file:relative,link:fs.readlinkSync(file),mode:s.mode&0o7777,uid:s.uid,gid:s.gid});
  else if(s.isDirectory())visit(file);
  else if(s.isFile())rows.push({file:relative,sha256:sha(file),mode:s.mode&0o7777,uid:s.uid,gid:s.gid});
  else throw Error('Unexpected package file type');
 }}visit(directory);return rows.sort((a,b)=>a.file.localeCompare(b.file));
}
function exact(rows){for(const r of rows){
 if(r.file.startsWith('/etc/'))continue; // Conffile is separately preserved exactly.
 const s=fs.lstatSync(r.file);assert.equal(s.mode&0o7777,r.mode,r.file);assert.equal(s.uid,r.uid);assert.equal(s.gid,r.gid);
 if(r.link!==undefined)assert.equal(fs.readlinkSync(r.file),r.link,r.file);else assert.equal(sha(r.file),r.sha256,r.file);
}}
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
let temporary;
try{
 assert.equal(run('dpkg',['--audit']),'');
 const space=fs.statfsSync('/');assert(Number(space.bavail)*Number(space.bsize)>=inputs.minimumFreeBytes);
 assert.equal(sha('/etc/ssl/openssl.cnf'),prepared.hostConfigurationSha256);
 assert(fs.existsSync('/usr/lib/ssl'),'Postinst would create an unexpected link');
 temporary=fs.mkdtempSync('/tmp/utilibre-host-crypto-release-');
 const payloads={};
 for(const [phase,files]of [['before',beforeFiles],['after',afterFiles]]){
  const dest=temporary+'/'+phase;fs.mkdirSync(dest);
  files.forEach((file,i)=>{
   const control=temporary+'/'+phase+'-control-'+i;run('dpkg-deb',['-x',file,dest]);run('dpkg-deb',['-e',file,control]);
   const expected=prepared.records.find(r=>r.phase===phase&&r.package===names[i]).control;
   assert.deepEqual(Object.fromEntries(fs.readdirSync(control).sort().map(n=>[n,sha(control+'/'+n)])),expected);
   for(const n of fs.readdirSync(control))if(['preinst','prerm','postinst','postrm','config'].includes(n)){
    assert(names[i]==='openssl'&&n==='postinst');
    assert.equal(fs.readFileSync(control+'/'+n,'utf8').trim(),'#!/bin/sh -e\n\nif [ ! -e /usr/lib/ssl ]\nthen\n  echo Linking /usr/lib/ssl to /etc/ssl\n  ln -sf /etc/ssl /usr/lib/ssl\nfi');
   }
  });payloads[phase]=payload(dest);
 }
 const common={preparedSha256:sha(out+'/prepared.json'),scanSha256:sha(out+'/scan-gate.json'),recipeSha256:sha(fileURLToPath(import.meta.url)),oldVersion:old,newVersion:next,
  packageHashes:afterFiles.map(sha),rollbackHashes:beforeFiles.map(sha),configSha256:sha('/etc/ssl/openssl.cnf'),otherPackagesSha256:hash(others()),payloads};
 const receiptPath=out+'/release.json';
 if(mode==='verify'){
  const receipt=read(receiptPath);assert(['installed-awaiting-restart','passed'].includes(receipt.status));
  for(const [k,v]of Object.entries(common))assert.deepEqual(receipt[k],v,k);
  names.forEach(n=>assert.equal(currentVersion(n),next));exact(payloads.after);
  run('/usr/sbin/sshd',['-t']);run('/usr/bin/openssl',['version']);
  const stale=mappedPredecessors();
  receipt.oldHostLibraryConsumers=stale;
  receipt.status=stale===0?'passed':'installed-awaiting-restart';
  receipt.lastVerifiedAt=new Date().toISOString();receipt.restartObserved=boot()!==receipt.bootId;save(receiptPath,receipt);
  console.log(JSON.stringify({status:receipt.status,oldHostLibraryConsumers:stale,restartObserved:receipt.restartObserved}));
 }else if(mode==='rollback'){
  const receipt=read(receiptPath);assert(['installed-awaiting-restart','passed','failed'].includes(receipt.status));
  assert.equal(receipt.recipeSha256,common.recipeSha256);names.forEach(n=>assert.equal(currentVersion(n),next));exact(payloads.after);
  run('dpkg',['--force-confold','--install',...beforeFiles],180000);exact(payloads.before);names.forEach(n=>assert.equal(currentVersion(n),old));
  assert.equal(hash(others()),common.otherPackagesSha256);assert.equal(sha('/etc/ssl/openssl.cnf'),common.configSha256);assert.equal(run('dpkg',['--audit']),'');run('/usr/sbin/sshd',['-t']);
  receipt.status='rolled-back-awaiting-restart';receipt.rollbackAt=new Date().toISOString();save(receiptPath,receipt);
  console.log('Exact predecessor packages restored; a coordinated restart is still required.');
 }else{
  assert(!fs.existsSync(receiptPath),'Existing release: use verify, never reinstall');
  assert.equal(hash(inventory()),prepared.packageInventorySha256);names.forEach(n=>assert.equal(currentVersion(n),old));exact(payloads.before);
  assert.equal(hash(fs.readFileSync('/var/lib/dpkg/status')),scan.statusSha256);
  run('/usr/sbin/sshd',['-t']);
  // Validate the real SSH configuration with the candidate library loader;
  // this parses configuration only and never binds a listener or reloads sshd.
  const loader='/lib64/ld-linux-x86-64.so.2',libraryPath=temporary+'/after/usr/lib/x86_64-linux-gnu';
  const linkage=run(loader,['--library-path',libraryPath,'--list','/usr/sbin/sshd']);
  assert(linkage.includes(libraryPath+'/libcrypto.so.3'));
  run(loader,['--library-path',libraryPath,'/usr/sbin/sshd','-t']);
  const simulation=run('apt-get',['--simulate','--no-download','--no-install-recommends','install',...afterFiles]);
  assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),names.toSorted());assert(!/^Remv /m.test(simulation));
  if(mode==='check'){
   save(out+'/release-check.json',{...common,date:new Date().toISOString(),passed:true,productionChanged:false,requiresCurrentWindow:true});
   console.log('Host OpenSSL release preflight passed. Four packages only; no host change. Current console/backup window and coordinated restart required.');
  }else{
   const checked=read(out+'/release-check.json');assert(checked.passed&&Date.now()-Date.parse(checked.date)<15*60000);
   for(const [k,v]of Object.entries(common))assert.deepEqual(checked[k],v,k);
   assert(Date.now()-Date.parse(inputs.database.metadata.UpdatedAt)<48*3600000,'Assessment is stale');
   const services=pids(),receipt={...common,startedAt:new Date().toISOString(),bootId:boot(),status:'installing',operatorWindowConfirmed:true};save(receiptPath,receipt);
   try{
    const log=run('dpkg',['--force-confold','--install',...afterFiles],180000);fs.writeFileSync(out+'/install.log',log+'\n',{mode:0o600});
    exact(payloads.after);names.forEach(n=>assert.equal(currentVersion(n),next));assert.equal(hash(others()),common.otherPackagesSha256);
    assert.equal(sha('/etc/ssl/openssl.cnf'),common.configSha256);assert.equal(run('dpkg',['--audit']),'');assert.equal(pids(),services);run('/usr/sbin/sshd',['-t']);
    run('/usr/bin/python3',[path.resolve(here,'../../../scripts/maintenance-update-policy.py'),'--write-unattended-blacklist']);
    const protection=fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8');names.forEach(n=>assert(protection.includes('^'+n.replaceAll('-','[-]'))));
    receipt.status='installed-awaiting-restart';receipt.installedAt=new Date().toISOString();receipt.oldHostLibraryConsumers=mappedPredecessors();save(receiptPath,receipt);
   }catch{
    receipt.status='failed';receipt.action='Inspect private diagnostic and exact rollback packages; no automatic process restart';save(receiptPath,receipt);throw Error('Host release failed; inspect private diagnostic before continuing');
   }
   console.log('Four packages installed and checked. No service reload or reboot performed; coordinated restart and verify remain required.');
  }
 }
}finally{
 if(temporary){assert(path.dirname(temporary)==='/tmp'&&path.basename(temporary).startsWith('utilibre-host-crypto-release-'));fs.rmSync(temporary,{recursive:true,force:true});}
 unlock();
}

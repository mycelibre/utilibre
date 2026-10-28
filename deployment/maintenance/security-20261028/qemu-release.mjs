// Reuse the existing five-minute Proxmox coordination gate. Default is read-only
// preparation; no update is possible without a separate operator attestation.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {windowGate} from '../qga-native-followup/policy.mjs';
import {inventory} from '../component-followup/inventory.mjs';
import {payloadManifest} from '../vendor-leaves-final/dhi-proof.mjs';
process.umask(0o077);
assert(['prepare','apply'].includes(process.argv[2])&&process.argv.length===3);
const apply=process.argv[2]==='apply',dir='/var/lib/utilibre-maintenance/security-20261028/qemu-native';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(new URL('./qemu-inputs.json',import.meta.url)),native=read(dir+'/native.json'),rollback=read(dir+'/rollback.json');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const service=()=>Object.fromEntries(run('systemctl',['show','qemu-guest-agent.service','-p','MainPID','-p','ActiveState','-p','SubState']).split('\n').map(l=>l.split('=')));
const others=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const packages=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!Object.keys(spec.packages).some(p=>l.startsWith(p+'='))).sort();
function config(){
  const rows={};
  for(const root of ['/etc/qemu','/etc/default/qemu-guest-agent','/etc/systemd/system/qemu-guest-agent.service.d']){
    if(!fs.existsSync(root))continue;
    for(const p of fs.statSync(root).isDirectory()?fs.readdirSync(root,{recursive:true}).map(p=>root+'/'+p):[root]){
      const st=fs.lstatSync(p);if(st.isFile())rows[p]={sha256:sha(p),mode:st.mode&0o7777};
      else if(st.isSymbolicLink())rows[p]={target:fs.readlinkSync(p)};
    }
  }return rows;
}
function actual(name){return inventory(name).records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));}
function noBlockUsers(){
  for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){
    let exe;try{exe=fs.readlinkSync('/proc/'+pid+'/exe');}catch{continue;}
    assert(!/^\/usr\/bin\/qemu-(?:img|io|nbd|storage-daemon)(?: \(deleted\))?$/.test(exe),'A block utility is active; do not replace it');
  }
}
assert(native.passed&&native.productionUnchanged&&rollback.passed);
assert.equal(native.version,spec.version);assert.deepEqual(native.packages,spec.packages);
assert(Date.now()-Date.parse(native.date)<86400000,'Refresh native preparation');
assert(!fs.existsSync(dir+'/release.json'),'Preserve prior release receipt');
assert.equal(run('dpkg',['--audit']),'');assert(fs.statfsSync(dir).bavail*fs.statfsSync(dir).bsize>=8*1024**3);
noBlockUsers();
const start=service();assert.equal(start.ActiveState,'active');assert.equal(start.SubState,'running');
assert.equal(sha('/proc/'+start.MainPID+'/exe'),native.baselineSha256);
assert.deepEqual(fs.readFileSync('/proc/'+start.MainPID+'/cmdline').toString().split('\0').filter(Boolean),['/usr/sbin/qemu-ga']);
assert(!fs.existsSync('/run/qga.state.isfrozen'));
const candidates=[],proofs=[];
for(const [name,p] of Object.entries(spec.packages)){
  assert.equal(run('dpkg-query',['-W','-f=${Version}',name]),p.before);
  const old=rollback.rows.find(r=>r.package===name);assert(old&&old.version===p.before);assert.equal(sha(old.file),old.sha256);assert.deepEqual(actual(name),old.payload);
  for(const c of old.controls)assert.equal(sha('/var/lib/dpkg/info/'+name+'.'+c.name),c.sha256);
  const file=dir+'/'+p.file;assert.equal(sha(file),p.sha256);candidates.push(file);
  const temp=fs.mkdtempSync(dir+'/candidate-payload-');try{run('dpkg-deb',['--extract',file,temp]);proofs.push({name,payload:payloadManifest(temp)});}finally{fs.rmSync(temp,{recursive:true});}
}
const simulation=run('apt-get',['--simulate','--no-install-recommends','install',...candidates]);
assert.deepEqual([...simulation.matchAll(/^Inst (\S+)/gm)].map(m=>m[1]).sort(),Object.keys(spec.packages).sort());assert(!/^Remv /m.test(simulation));
const before={otherPackages:packages(),otherServicePids:others(),config:config(),agentPid:Number(start.MainPID)};
const common={version:spec.version,packages:spec.packages,proofs,rollbackSha256:sha(dir+'/rollback.json'),nativeSha256:sha(dir+'/native.json'),...before};
if(!apply){
  fs.writeFileSync(dir+'/prepared.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-deployed',...common,simulation,productionChanged:false},null,2)+'\n');
  console.log('Exact native packages, rollback payloads, two-package simulation and live prerequisites verified; not deployed.');
}else{
  const coordination=dir+'/coordination.json',st=fs.statSync(coordination);assert.equal(st.uid,0);assert.equal(st.mode&0o077,0);
  const prepared=read(dir+'/prepared.json');assert.equal(prepared.status,'prepared-not-deployed');assert(Date.now()-Date.parse(prepared.date)<1800000);
  for(const [key,value] of Object.entries(common))assert.deepEqual(prepared[key],value,'Changed preparation: '+key);
  windowGate(read(coordination),Number(start.MainPID));
  const report={startedAt:new Date().toISOString(),status:'approved',...common,coordinationSha256:sha(coordination)};
  const save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');save();
  const preserve=()=>{assert.deepEqual(packages(),before.otherPackages);assert.equal(others(),before.otherServicePids);assert.deepEqual(config(),before.config);assert.equal(run('dpkg',['--audit']),'');};
  try{
    noBlockUsers();windowGate(read(coordination),Number(service().MainPID));assert(!fs.existsSync('/run/qga.state.isfrozen'));
    fs.writeFileSync(dir+'/install.log',run('apt-get',['--no-download','--no-install-recommends','-y','install',...candidates])+'\n');
    for(const p of proofs){assert.equal(run('dpkg-query',['-W','-f=${Version}',p.name]),spec.version);assert.deepEqual(actual(p.name),p.payload);}
    const current=service();assert.equal(current.ActiveState,'active');assert.equal(current.SubState,'running');assert(current.MainPID!==start.MainPID);
    assert.equal(sha('/proc/'+current.MainPID+'/exe'),proofs.find(p=>p.name==='qemu-guest-agent').payload.find(p=>p.path==='/usr/sbin/qemu-ga').sha256);
    preserve();assert(!fs.existsSync('/run/qga.state.isfrozen'));
    report.status='native-passed-control-plane-pending';report.agentPidAfter=Number(current.MainPID);report.completedAt=new Date().toISOString();save();
    console.log('Native update passed; Docker/SSH/configuration unchanged. Proxmox ping/thawed postcheck remains required.');
  }catch(e){
    report.status='failed';report.error=String(e.message).slice(0,1000);save();
    try{
      windowGate(read(coordination),Number(start.MainPID));assert(!fs.existsSync('/run/qga.state.isfrozen'));noBlockUsers();
      fs.writeFileSync(dir+'/rollback.log',run('apt-get',['--no-download','--allow-downgrades','--no-install-recommends','-y','install',...rollback.rows.map(r=>r.file)])+'\n');
      for(const old of rollback.rows){assert.equal(run('dpkg-query',['-W','-f=${Version}',old.package]),old.version);assert.deepEqual(actual(old.package),old.payload);}
      preserve();assert.equal(service().ActiveState,'active');assert.equal(sha('/proc/'+service().MainPID+'/exe'),native.baselineSha256);report.rollback='Exact previous packages and active agent verified';
    }catch{report.rollback='Not verified; inspect Proxmox console before further agent operations';}
    save();throw Error('Native update failed; private release record retained');
  }
}

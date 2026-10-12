// One signed native library, no packet capture, service restart or distro change.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
assert([undefined,'--apply'].includes(process.argv[2])&&process.argv.length<=3);
const dir='/var/lib/utilibre-maintenance/host-extra-followup-20261012/pcap';
const recipe=new URL('./check-pcap.py',import.meta.url).pathname;
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:90000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const files=[['1.10.5-2','6a756d536a5b0cd3ef92f19ff9f22ed80c66baadbc0fe55d599f4aa0c27d3f86'],['1.10.7-1','161a4b0dc1cc545ac2e33b84ef7b28d54f136897890a0f434ede7427dd5c25a9']];
const deb=v=>`${dir}/libpcap0.8t64_${v}_amd64.deb`;
const index=fs.readFileSync(dir+'/package-index.txt','utf8').split('\n\n');
for(const [version,hash]of files){assert.equal(sha(deb(version)),hash);assert(index.some(p=>p.includes('Version: '+version+'\n')&&p.includes('SHA256: '+hash)));}
assert.equal(run('dpkg-query',['-W','-f=${Version}','libpcap0.8t64']),files[0][0]);
assert.equal(run('dpkg',['--audit']),'');
assert(!fs.existsSync(dir+'/release.json'),'Do not overwrite a completed release');
const simulation=run('apt-get',['--simulate','install',deb(files[1][0])]);
assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),['libpcap0.8t64']);
assert(!simulation.split('\n').some(l=>l.startsWith('Remv ')));
const pids=()=>run('systemctl',['show','docker.service','ssh.service','-p','Id','-p','MainPID']);
const beforePids=pids(),libc=run('dpkg-query',['-W','-f=${Version}','libc6']);
const loaded=()=>fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)).filter(p=>{try{return !fs.readFileSync(`/proc/${p}/cgroup`,'utf8').includes('docker')&&/libpcap/.test(fs.readFileSync(`/proc/${p}/maps`,'utf8'));}catch{return false;}});
assert.deepEqual(loaded(),[],'Do not replace an actively mapped host library without a consumer restart plan');
const temp=fs.mkdtempSync('/tmp/utilibre-pcap-stage-');fs.chmodSync(temp,0o755);
const report={startedAt:new Date().toISOString(),status:'prepared',package:'libpcap0.8t64',old:files[0][0],candidate:files[1][0],files,simulation,livePacketsCaptured:0};
const save=()=>fs.writeFileSync(dir+'/release.json',JSON.stringify(report,null,2)+'\n');
try{
 run('dpkg-deb',['-x',deb(files[0][0]),temp+'/old']);run('dpkg-deb',['-x',deb(files[1][0]),temp+'/new']);
 const lib=version=>`/usr/lib/x86_64-linux-gnu/libpcap.so.${version.split('-')[0]}`;
 const old=temp+'/old'+lib(files[0][0]),next=temp+'/new'+lib(files[1][0]);
 assert.equal(sha(old),sha(lib(files[0][0])));
 const symbols=p=>new Set(run('readelf',['--dyn-syms','--wide',p]).split('\n').map(l=>l.trim().split(/\s+/)).filter(a=>['GLOBAL','WEAK'].includes(a[4])&&a[5]==='DEFAULT'&&a[6]!=='UND').map(a=>a[3]+':'+a[7].replace('@@','@')));
 const before=symbols(old),after=symbols(next);for(const required of ['pcap_open_dead','pcap_compile','pcap_offline_filter','pcap_dump','bpf_filter'])assert(before.has('FUNC:'+required),'Incomplete native symbol inventory');for(const name of before)assert(after.has(name),'Removed native ABI '+name);
 report.preservedSymbols=before.size;report.oldLibrarySha256=sha(old);report.newLibrarySha256=sha(next);
 const check=p=>JSON.parse(run('runuser',['-u','nobody','--','/usr/bin/python3',recipe,p]));
 report.staged=check(next);assert(report.staged.passed&&report.staged.scratchBoundCases===8);
 if(process.argv[2]==='--apply'){
  save();
  try{
   run('dpkg',['--install',deb(files[1][0])]);
   assert.equal(run('dpkg-query',['-W','-f=${Version}','libpcap0.8t64']),files[1][0]);
   assert.equal(sha(lib(files[1][0])),report.newLibrarySha256);
   report.live=check(lib(files[1][0]));assert(report.live.passed);
   assert.equal(run('dpkg',['--audit']),'');assert.equal(pids(),beforePids);
   assert.equal(run('dpkg-query',['-W','-f=${Version}','libc6']),libc);assert.deepEqual(loaded(),[]);
   report.status='passed';report.noServiceRestart=true;report.completedAt=new Date().toISOString();save();
  }catch(error){
   report.status='failed';report.error=error.message.slice(0,300);
   try{run('dpkg',['--install',deb(files[0][0])]);assert.equal(sha(lib(files[0][0])),report.oldLibrarySha256);report.rollback='exact old package restored';}catch{report.rollback='NOT VERIFIED';}
   save();throw Error('Host pcap release failed; inspect private receipt');
  }
 }
 console.log(JSON.stringify({status:report.status,staged:report.staged,live:report.live,preservedSymbols:report.preservedSymbols}));
}finally{assert(temp.startsWith('/tmp/utilibre-pcap-stage-'));fs.rmSync(temp,{recursive:true});}

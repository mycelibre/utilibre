// Read-only host ABI/config/dependency gate. Does not contact the actual daemon.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-server-followup-20261012';
const previous='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const packages=['openssh-client','openssh-server','openssh-sftp-server'];
const old='1:10.0p1-7+deb13u4+utilibre1',next='1:10.0p1-7+deb13u4+utilibre2';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(c,a)=>{try{return cp.execFileSync(c,a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(root+'/host-gate-error.log',String(e.stderr||e.stdout||e.message));throw Error('Host SSH preflight failed; private host-gate-error.log');}};
const native=JSON.parse(fs.readFileSync(root+'/native.json'));
assert(native.passed&&native.checks.length===11);assert.equal(native.packageVersion,next);
const manifest=JSON.parse(fs.readFileSync(root+'/backport.json'));
assert.equal(manifest.serverPatchSha256,sha(fs.readFileSync(new URL('./openssh-server-backport.patch',import.meta.url))));
const lifetime=JSON.parse(fs.readFileSync(previous+'/backport.json'));
assert.equal(lifetime.commit,manifest.preservedClientCommit);
assert.equal(manifest.clientPatchSha256,sha(fs.readFileSync(previous+'/client-lifetime-backport.patch')));
const preservedClientSource={};
for(const record of lifetime.records){
 assert.equal(sha(fs.readFileSync(root+'/openssh-10.0p1/'+record.file)),record.after);
 preservedClientSource[record.file]=record.after;
}
assert.deepEqual(Object.keys(preservedClientSource).sort(),['ssh.c','sshconnect.c','sshconnect.h','sshconnect2.c']);
const payloads={'ssh':'usr/bin/ssh','sshd':'usr/sbin/sshd','sshd-auth':'usr/lib/openssh/sshd-auth','sshd-session':'usr/lib/openssh/sshd-session','sftp-server':'usr/lib/openssh/sftp-server'};
const extract=fs.mkdtempSync(root+'/host-extract-');
const candidates=packages.map(p=>root+'/'+p+'_'+next.slice(2)+'_amd64.deb');
const rollback=packages.map(p=>previous+'/'+p+'_'+old.slice(2)+'_amd64.deb');
for(const file of candidates){assert.equal(run('dpkg-deb',['-f',file,'Version']),next);run('dpkg-deb',['-x',file,extract]);}
for(const [name,path] of Object.entries(payloads)){
 assert.equal(sha(fs.readFileSync(extract+'/'+path)),native.payloadSha256[name]);
 assert(!/not found/.test(run('ldd',[extract+'/'+path])));
}
run(extract+'/usr/bin/ssh',['-V']);
run(extract+'/usr/sbin/sshd',['-t','-o','SshdAuthPath='+extract+'/usr/lib/openssh/sshd-auth','-o','SshdSessionPath='+extract+'/usr/lib/openssh/sshd-session']);
assert.equal(run('/usr/sbin/sshd',['-T']),run(extract+'/usr/sbin/sshd',['-T']),'Effective host configuration differs');
const versions=Object.fromEntries(run('dpkg-query',['-W','-f=${Package} ${Version}\n',...packages]).split('\n').map(s=>s.split(' ')));
assert(Object.values(versions).every(v=>v===old));
const simulation=run('apt-get',['-s','install',...candidates]);
assert(!/^Remv /m.test(simulation));
assert.deepEqual(simulation.split('\n').filter(s=>s.startsWith('Inst ')).map(s=>s.split(' ')[1]).sort(),[...packages].sort());
run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);run('systemctl',['is-active','--quiet','docker.service']);
assert.equal(run('dpkg',['--audit']),'');
const proposal={date:new Date().toISOString(),status:'staged-not-installed',old,next,cves:['CVE-2026-59999','CVE-2026-60000'],
 packages:Object.fromEntries(candidates.map(p=>[p,sha(fs.readFileSync(p))])),rollback:Object.fromEntries(rollback.map(p=>[p,sha(fs.readFileSync(p))])),
 payloadSha256:native.payloadSha256,checks:root+'/native.json',nativeReceiptSha256:sha(fs.readFileSync(root+'/native.json')),
 preservedClientSource,preservedClientCommit:lifetime.commit,
 source:root+'/backport.json',sourceReceiptSha256:sha(fs.readFileSync(root+'/backport.json')),
 stableDependencies:true,hostDynamicLinking:true,hostConfigurationParses:true,effectiveConfigurationEqual:true,
 exactThreePackageSimulation:true,sshAndDockerActive:true,productionChanged:false,
 futureUpdateProtection:'All installed +utilibre package versions are automatically protected by the host maintenance policy.'};
fs.writeFileSync(root+'/proposal.json',JSON.stringify(proposal,null,2)+'\n');
console.log(JSON.stringify({version:next,status:proposal.status,checks:native.checks.length,stableDependencies:true,hostConfigurationParses:true,effectiveConfigurationEqual:true,exactThreePackageSimulation:true,sshAndDockerActive:true}));

// Run only after the parent reviews proposal.json and authorizes this exact
// three-package release. Preserve sessions, configuration, and retained rollback.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-server-followup-20261012';
const proposal=JSON.parse(fs.readFileSync(root+'/proposal.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(root+'/release.json'),'Do not overwrite release evidence');
assert(Date.now()-Date.parse(proposal.date)<86400000);
assert.equal(proposal.status,'staged-not-installed');
assert.equal(sha(fs.readFileSync(proposal.checks)),proposal.nativeReceiptSha256);
assert.equal(sha(fs.readFileSync(proposal.source)),proposal.sourceReceiptSha256);
for(const [p,h] of Object.entries({...proposal.packages,...proposal.rollback}))assert.equal(sha(fs.readFileSync(p)),h);
const packages=['openssh-client','openssh-server','openssh-sftp-server'];
const run=(c,a)=>{try{return cp.execFileSync(c,a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive'}}).trim();}catch(e){fs.writeFileSync(root+'/release-error.log',String(e.stderr||e.stdout||e.message));throw Error('SSH release check failed; private release-error.log');}};
const versions=()=>Object.fromEntries(run('dpkg-query',['-W','-f=${Package} ${Version}\n',...packages]).split('\n').map(s=>s.split(' ')));
function configurations(){
 const result={};
 const walk=d=>{for(const name of fs.readdirSync(d).sort()){
  const path=d+'/'+name,s=fs.lstatSync(path),meta={mode:s.mode,uid:s.uid,gid:s.gid};
  if(s.isDirectory()){result[path]=meta;walk(path);}
  else if(s.isFile())result[path]={...meta,sha256:sha(fs.readFileSync(path))};
  else if(s.isSymbolicLink())result[path]={...meta,target:fs.readlinkSync(path)};
 }};walk('/etc/ssh');return result;
}
assert(Object.values(versions()).every(v=>v===proposal.old));
const candidates=Object.keys(proposal.packages),rollback=Object.keys(proposal.rollback);
const simulation=run('apt-get',['-s','install',...candidates]);
assert(!/^Remv /m.test(simulation));
assert.deepEqual(simulation.split('\n').filter(s=>s.startsWith('Inst ')).map(s=>s.split(' ')[1]).sort(),[...packages].sort());
run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);run('systemctl',['is-active','--quiet','docker.service']);
const protection=fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages','utf8');
for(const p of packages)assert(protection.includes('^'+p.replaceAll('-','[-]')+'(:[a-z0-9-]+)?$'),'Existing unattended-update protection missing');
const before=configurations(),effective=sha(run('/usr/sbin/sshd',['-T']));
const report={date:new Date().toISOString(),status:'applying',old:proposal.old,next:proposal.next,proposalSha256:sha(fs.readFileSync(root+'/proposal.json')),configurationBefore:before,effectiveConfigurationBefore:effective};
const save=()=>fs.writeFileSync(root+'/release.json',JSON.stringify(report,null,2)+'\n');save();
try{
 run('dpkg',['--force-confold','--install',...candidates]);
 assert(Object.values(versions()).every(v=>v===proposal.next));assert.equal(run('dpkg',['--audit']),'');
 run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);run('systemctl',['is-active','--quiet','docker.service']);
 assert.deepEqual(configurations(),before);assert.equal(sha(run('/usr/sbin/sshd',['-T'])),effective);
 for(const [name,path] of Object.entries({'ssh':'/usr/bin/ssh','sshd':'/usr/sbin/sshd','sshd-auth':'/usr/lib/openssh/sshd-auth','sshd-session':'/usr/lib/openssh/sshd-session','sftp-server':'/usr/lib/openssh/sftp-server'}))assert.equal(sha(fs.readFileSync(path)),proposal.payloadSha256[name]);
 report.status='passed';report.configurationAndKeysUnchanged=true;report.sshAndDockerActive=true;report.updateProtectionVerified=true;report.completedAt=new Date().toISOString();save();
 console.log('OpenSSH utilibre2 deployed: three coupled packages, tested payloads, unchanged configuration/keys, active SSH and Docker, clean dpkg audit.');
}catch{
 report.status='failed';report.rollback='attempting';save();
 try{run('dpkg',['--force-confold','--install',...rollback]);run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);assert(Object.values(versions()).every(v=>v===proposal.old));assert.deepEqual(configurations(),before);report.rollback='verified';}catch{report.rollback='unverified';}
 save();throw Error('SSH release failed; rollback '+report.rollback);
}

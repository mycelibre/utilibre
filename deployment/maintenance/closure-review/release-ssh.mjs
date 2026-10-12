// Signed stable source + narrow upstream client lifetime backport. Debian pins
// sshd/sftp to the exact client version, so install the three tested packages
// together; never force broken dependencies or pull a sid libc into this VM.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const packages=['openssh-client','openssh-server','openssh-sftp-server'];
const old='1:10.0p1-7+deb13u4',next=old+'+utilibre1';
const run=(cmd,args)=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive'}}).trim();}catch(e){fs.writeFileSync(root+'/release-error.log',String(e.stderr||e.stdout||e.message));throw Error('SSH package gate failed; private release-error.log');}};
const versions=()=>Object.fromEntries(run('dpkg-query',['-W','-f=${Package} ${Version}\n',...packages]).split('\n').map(x=>x.split(' ')));
const sha=b=>createHash('sha256').update(b).digest('hex');
function configHashes(){const rows={};function walk(d){for(const n of fs.readdirSync(d).sort()){const p=d+'/'+n,s=fs.lstatSync(p);if(s.isDirectory())walk(p);else if(s.isFile())rows[p]=sha(fs.readFileSync(p));}}walk('/etc/ssh');return rows;}
assert(!fs.existsSync(root+'/release.json'),'Do not overwrite completed release evidence');
assert(Object.values(versions()).every(v=>v===old));
const native=JSON.parse(fs.readFileSync(root+'/native.json'));assert(native.passed&&native.checks.length===2);assert.equal(native.packageVersion,next);
assert(Date.now()-Date.parse(native.date)<86400000);
const files=v=>packages.map(p=>`${root}/${p}_${v===old?v.replace(':','%3a'):v.replace(/^1:/,'')}_amd64.deb`);
const originals=files(old),candidates=files(next);for(const p of [...originals,...candidates])assert(fs.statSync(p).size>10000);
const simulation=run('apt-get',['-s','install',...candidates]);assert(!/^Remv /m.test(simulation));
assert.deepEqual(simulation.split('\n').filter(x=>x.startsWith('Inst ')).map(x=>x.split(' ')[1]).sort(),[...packages].sort());
run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);
const before=configHashes(),report={date:new Date().toISOString(),status:'applying',old,next,packages:Object.fromEntries([...originals,...candidates].map(p=>[p.split('/').at(-1),sha(fs.readFileSync(p))])),upstreamCommit:'e8bdfb151a356d0171fea4194dd205fbb252be23',native:root+'/native.json',configurationBefore:before};
const save=()=>fs.writeFileSync(root+'/release.json',JSON.stringify(report,null,2)+'\n');save();
try{
 run('dpkg',['--force-confold','--install',...candidates]);
 assert(Object.values(versions()).every(v=>v===next));assert.equal(run('dpkg',['--audit']),'');
 run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);
 assert.deepEqual(configHashes(),before,'SSH keys/configuration changed');
 assert.equal(sha(fs.readFileSync('/usr/bin/ssh')),native.clientSha256);
 report.status='passed';report.configurationAndKeysUnchanged=true;report.completedAt=new Date().toISOString();save();
 console.log('OpenSSH stable backport deployed; all three exact dependencies, SSH configuration/keys and running daemon verified. No reboot.');
}catch{
 report.status='failed';report.rollback='attempting';save();
 try{run('dpkg',['--force-confold','--install',...originals]);run('/usr/sbin/sshd',['-t']);run('systemctl',['is-active','--quiet','ssh.service']);assert(Object.values(versions()).every(v=>v===old));report.rollback='verified';}catch{report.rollback='unverified';}save();throw Error('SSH release failed; rollback '+report.rollback);
}

// Prepare exact coupled-package release/rollback evidence, never activate it.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const [candidate,checks]=process.argv.slice(2);assert(process.argv.length===4&&path.isAbsolute(candidate)&&path.isAbsolute(checks));assert(!fs.existsSync(checks+'/proposal.json'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const run=(cmd,args)=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const previous='/var/lib/utilibre-maintenance/ssh-server-followup-20261012',old='1:10.0p1-7+deb13u4+utilibre2',next='1:10.0p1-7+deb13u4+utilibre3';
const names=['openssh-client','openssh-server','openssh-sftp-server'];
const native=read(checks+'/native.json'),username=read(checks+'/username.json');assert(native.passed&&native.checks.length===11);assert.equal(native.packageVersion,next);assert(username.passed);
assert(username.rows.find(r=>r.label==='candidate').rejected.every(Boolean));assert(username.rows.find(r=>r.label==='baseline').rejected.every(v=>!v));
const oldProposal=read(previous+'/proposal.json');assert.equal(read(previous+'/release.json').status,'passed');
const bins={ssh:'/usr/bin/ssh',sshd:'/usr/sbin/sshd','sshd-auth':'/usr/lib/openssh/sshd-auth','sshd-session':'/usr/lib/openssh/sshd-session','sftp-server':'/usr/lib/openssh/sftp-server'};
for(const [name,p]of Object.entries(bins))assert.equal(sha(p),oldProposal.payloadSha256[name],'Current host payload changed');
const files=names.map(n=>candidate+'/'+n+'_'+next.slice(2)+'_amd64.deb'),rollback=names.map(n=>previous+'/'+n+'_'+old.slice(2)+'_amd64.deb');
const extract=fs.mkdtempSync(checks+'/preflight-');let effective;
try{
 for(let i=0;i<names.length;i++){
  assert.equal(run('dpkg-query',['-W','-f=${Version}',names[i]]),old);assert.equal(sha(rollback[i]),oldProposal.packages[rollback[i]]);
  assert.equal(run('dpkg-deb',['-f',files[i],'Version']),next);run('dpkg-deb',['-x',files[i],extract]);
 }
 for(const [name,p]of Object.entries(bins)){assert.equal(sha(extract+p),native.payloadSha256[name]);assert(!run('ldd',[extract+p]).includes('not found'));}
 run(extract+'/usr/sbin/sshd',['-t','-o','SshdAuthPath='+extract+'/usr/lib/openssh/sshd-auth','-o','SshdSessionPath='+extract+'/usr/lib/openssh/sshd-session']);
 effective=run('/usr/sbin/sshd',['-T']);assert.equal(run(extract+'/usr/sbin/sshd',['-T']),effective);
}finally{fs.rmSync(extract,{recursive:true});}
const simulation=run('apt-get',['-s','install',...files]);assert(!/^Remv /m.test(simulation));assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),[...names].sort());
assert.equal(run('dpkg',['--audit']),'');assert.equal(run('systemctl',['is-active','ssh.service']),'active');
const proposal={date:new Date().toISOString(),status:'ready-awaiting-ssh-window',old,next,packages:Object.fromEntries(files.map(p=>[p,sha(p)])),rollback:Object.fromEntries(rollback.map(p=>[p,sha(p)])),payloadSha256:native.payloadSha256,checksSha256:sha(checks+'/native.json'),usernameChecksSha256:sha(checks+'/username.json'),hostConfigurationParses:true,effectiveConfigurationEqual:true,exactThreePackageSimulation:true,gssapiAuthenticationConfigured:effective.split('\n').find(l=>l.startsWith('gssapiauthentication '))?.split(' ')[1],gssapiKeyExchangeConfigured:effective.split('\n').find(l=>l.startsWith('gssapikeyexchange '))?.split(' ')[1],gssapiCvesFixed:false,bootFilesChanged:false,productionChanged:false};
assert.equal(proposal.gssapiAuthenticationConfigured,'no');assert.equal(proposal.gssapiKeyExchangeConfigured,'no');
fs.writeFileSync(checks+'/proposal.json',JSON.stringify(proposal,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:proposal.status,version:next,packages:names,gssapi:'configured off, not patched',hostConfigurationParses:true,effectiveConfigurationEqual:true,productionChanged:false}));

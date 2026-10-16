// Exact utilibre3 source/payload revalidation; outputs proposals, never applies.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';import {absentComponent} from '../review-binary-scope.mjs';
process.umask(0o077);const [candidate,checks,reviewOutput]=process.argv.slice(2);assert([4,5].includes(process.argv.length)&&path.isAbsolute(candidate)&&path.isAbsolute(checks));const out=reviewOutput||checks+'/review.json';assert(path.isAbsolute(out)&&!fs.existsSync(out));assert.equal(fs.statSync(path.dirname(out)).mode&0o077,0);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args,options={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...options}).trim();
const root='/var/lib/utilibre-maintenance',previous=root+'/ssh-server-followup-20261012',scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(checks+'/release.json'),proposal=read(checks+'/proposal.json'),native=read(checks+'/native.json'),username=read(checks+'/username.json');
assert.equal(release.status,'passed');assert.equal(release.proposalSha256,sha(checks+'/proposal.json'));assert.equal(proposal.next,'1:10.0p1-7+deb13u4+utilibre3');
assert(Date.parse(scan.host.scannedAt||scan.date)>=Date.parse(release.completedAt),'Host scan must include this release');
assert.equal(sha(checks+'/native.json'),proposal.checksSha256);assert.equal(sha(checks+'/username.json'),proposal.usernameChecksSha256);
assert(native.passed&&native.checks.length===11&&username.passed);assert.equal(native.packageVersion,proposal.next);
const oldRow=username.rows.find(x=>x.label==='baseline'),newRow=username.rows.find(x=>x.label==='candidate');
assert(oldRow.rejected.length===4&&oldRow.rejected.every(x=>x===false));assert(newRow.rejected.length===4&&newRow.rejected.every(x=>x===true));
assert(native.checks.filter(x=>x.name==='native-compatibility').every(x=>x.echoBytes===524288&&x.rekeyLimit===16384&&x.changedHostRejected));
for(const [f,h]of Object.entries(proposal.packages))assert.equal(sha(f),h);
const binaries={ssh:'/usr/bin/ssh',sshd:'/usr/sbin/sshd','sshd-auth':'/usr/lib/openssh/sshd-auth','sshd-session':'/usr/lib/openssh/sshd-session','sftp-server':'/usr/lib/openssh/sftp-server'};
for(const [n,p]of Object.entries(binaries))assert.equal(sha(p),proposal.payloadSha256[n]);
const files=new Map();for(const n of ['openssh-client','openssh-server','openssh-sftp-server']){assert.equal(run('dpkg-query',['-W','-f=${Version}',n]),proposal.next);files.set(n,run('dpkg-query',['-L',n]).split('\n'));}
const temp=fs.mkdtempSync(checks+'/source-review-'),source=temp+'/openssh-10.0p1',sourceHashes={};
try{
 run('dpkg-source',['-x',candidate+'/openssh_10.0p1-7+deb13u4+utilibre3.dsc',source]);
 const old=read(previous+'/proposal.json');
 for(const [f,h]of Object.entries(old.preservedClientSource)){assert.equal(sha(source+'/'+f),h);sourceHashes[f]=h;}
 for(const f of ['auth2-gss.c','serverloop.c','gss-serv.c','auth2.c','ssh-gss.h','monitor.c']){sourceHashes[f]=sha(source+'/'+f);assert.equal(sourceHashes[f],sha(previous+'/openssh-10.0p1/'+f));}
 assert.equal(sha(source+'/readconf.c'),'3c3e6c0c6121027bcf8ed01c6c4ebe14dfdd8bb21d46ed5d754706eaa99fdca2');sourceHashes['readconf.c']=sha(source+'/readconf.c');
 run('git',['apply','--reverse','--check',new URL('./username-106583.patch',import.meta.url).pathname],{cwd:source});
}finally{fs.rmSync(temp,{recursive:true});}
const reasons={
 'CVE-2026-60002':'Retained e8bdfb151a356d0171fea4194dd205fbb252be23 client lifetime fix: all four affected source files are byte-identical to the earlier reviewed repair. Native SSH/rekey/host-key interoperability passes; not a new exploit reproduction.',
 'CVE-2026-59999':'Retained 8dfe7ed6e2fd988de08df508355a196b956b2753 server fix: native TUN with DisableForwarding=yes was accepted before and rejected by the new packages; legitimate forwarding still passes.',
 'CVE-2026-60000':'Retained 5d04ca6af739b82fd30d84d2783ca802ebfa1192 failure-accounting repair: old native server accepts five attempts past MaxAuthTries=3, candidate disconnects at three; legitimate private-realm Kerberos authentication passes. Not the newer GSSAPI advisories.',
 'CVE-2026-106583':'Upstream 0c4c9a7b320bd7ff61c4a2dc345cb2e27e9663b2 readconf.c username fix. Four CLI dollar/backslash cases accepted by old native ssh are rejected by candidate; four legitimate users and explicit configuration literal still work. No shell command or production connection used.',
};
const decisions=[];
for(const i of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.type==='debian'&&i.installed===proposal.next&&files.has(i.package))){
 let status,reason;
 if(Object.hasOwn(reasons,i.id)){
  const client=['CVE-2026-60002','CVE-2026-106583'].includes(i.id),affected=i.package===(client?'openssh-client':'openssh-server');
  if(!affected)assert(!files.get(i.package).some(f=>client?/\/(?:s?bin|libexec)\/ssh$/.test(f):/\/(sshd|sshd-auth|sshd-session)$/.test(f)));
  status=affected?'mitigated':'not-affected';reason=(affected?'Exact installed backport. ':'Unrelated binary sibling; affected component absent from dpkg inventory. ')+reasons[i.id];
 }else{const component=absentComponent(i,files.get(i.package));if(!component)continue;status='not-affected';reason='Binary subpackage attribution only: '+component+'. The affected server findings remain unresolved; no GSSAPI repair is claimed.';}
 decisions.push(validateDecision({key:i.key,status,expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Exact source, installed payload, three-package release and native-test hashes verified. Evidence: ssh-username-20261016-check/{review,native,username,proposal,release}.json. https://security-tracker.debian.org/tracker/'+i.id}));
}
fs.writeFileSync(out,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,hostScannedAt:scan.host.scannedAt||scan.date,sourceHashes,releaseSha256:sha(checks+'/release.json'),proposalSha256:sha(checks+'/proposal.json'),applied:false,decisions},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({prepared:decisions.length,applied:false,gssapiNewServerCvesFixed:false}));

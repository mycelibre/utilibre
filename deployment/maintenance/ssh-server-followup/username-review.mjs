// Exact reviewed 10.0/10.3 source/payload revalidation; proposals, never applies.
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';import {absentComponent} from '../review-binary-scope.mjs';
process.umask(0o077);const [candidate,checks,reviewOutput]=process.argv.slice(2);assert([4,5].includes(process.argv.length)&&path.isAbsolute(candidate)&&path.isAbsolute(checks));const out=reviewOutput||checks+'/review.json';assert(path.isAbsolute(out)&&!fs.existsSync(out));assert.equal(fs.statSync(path.dirname(out)).mode&0o077,0);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args,options={})=>cp.execFileSync(cmd,args,{encoding:'utf8',timeout:30000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...options}).trim();
const root='/var/lib/utilibre-maintenance',previous=root+'/ssh-server-followup-20261012',scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(checks+'/release.json'),proposal=read(checks+'/proposal.json'),native=read(checks+'/native.json'),username=read(checks+'/username.json');
assert.equal(release.status,'passed');assert.equal(release.proposalSha256,sha(checks+'/proposal.json'));
const backports=proposal.next==='1:10.3p1-1~bpo13+1+utilibre1';
assert(backports||proposal.next==='1:10.0p1-7+deb13u4+utilibre3','Unsupported reviewed release');
if(backports)assert.equal(proposal.old,'1:10.3p1-1~bpo13+1');
assert(Date.parse(scan.host.scannedAt||scan.date)>=Date.parse(release.completedAt),'Host scan must include this release');
assert.equal(sha(checks+'/native.json'),proposal.checksSha256);assert.equal(sha(checks+'/username.json'),proposal.usernameChecksSha256);
assert(native.passed&&native.checks.length===11&&username.passed);assert.equal(native.packageVersion,proposal.next);
const oldRow=username.rows.find(x=>x.label==='baseline'),newRow=username.rows.find(x=>x.label==='candidate');
assert(oldRow.rejected.length===4&&oldRow.rejected.every(x=>x===false));assert(newRow.rejected.length===4&&newRow.rejected.every(x=>x===true));
for(const r of [oldRow,newRow]){assert.equal(r.legitimateUsers,4);assert.equal(r.configurationLiteralPreserved,true);}
assert.equal(newRow.binarySha256,proposal.payloadSha256.ssh);
const compatibility=native.checks.filter(x=>x.name==='native-compatibility');assert.equal(compatibility.length,3);
assert(compatibility.every(x=>x.echoBytes===524288&&x.rekeyLimit===16384&&x.changedHostRejected));
for(const [f,h]of Object.entries(proposal.packages))assert.equal(sha(f),h);
const binaries={ssh:'/usr/bin/ssh',sshd:'/usr/sbin/sshd','sshd-auth':'/usr/lib/openssh/sshd-auth','sshd-session':'/usr/lib/openssh/sshd-session','sftp-server':'/usr/lib/openssh/sftp-server'};
for(const [n,p]of Object.entries(binaries))assert.equal(sha(p),proposal.payloadSha256[n]);
const files=new Map();for(const n of ['openssh-client','openssh-server','openssh-sftp-server']){assert.equal(run('dpkg-query',['-W','-f=${Version}',n]),proposal.next);files.set(n,run('dpkg-query',['-L',n]).split('\n'));}
const temp=fs.mkdtempSync(checks+'/source-review-'),source=temp+'/openssh-source',sourceHashes={};
try{
 if(backports){
  assert.equal(sha(candidate+'/openssh_10.3p1.orig.tar.gz'),'56682a36bb92dcf4b4f016fd8ec8e74059b79a8de25c15d670d731e7d18e45f4');
  run('dpkg-source',['-x',candidate+'/openssh_10.3p1-1~bpo13+1+utilibre1.dsc',source]);
  // Reverse the exact approved patch sequence in this disposable tree. Require
  // all seven preimages to match authenticated Debian 10.3, not the old 10.0
  // file hashes or a version-string waiver. No fuzz or conflict resolution.
  const baseline={
   'ssh.c':'b196634f638393231df2067ad3f0aca1a97f15511f8decf0ee838de956c0531f',
   'sshconnect.c':'ff2012d5616cf0400dc80153c35d6a9bf77537de5fb5ca056673c7ea9e0335d1',
   'sshconnect.h':'1819ee2f8ad6183a5624a0b7ff7af5970d65f7019404046a494a7c53983b48d2',
   'sshconnect2.c':'cbff957dac20297f837f813147d729fdbc3854e8b2f49402077153031e99ef4e',
   'auth2-gss.c':'7fe471a8f58868e1c2a34ae4989fd22947adf81b51ea21b14d2c4e947981a7bd',
   'serverloop.c':'1812fe7e40533860cd78e95b340b35e4c077c69debdb215eafcb1495c823de5a',
   'readconf.c':'dee014c07b7be1a562b8823b324dbcb7973a6af0cd0d4d56fe549e419b4a0e18',
  };
  for(const f of Object.keys(baseline))sourceHashes[f]=sha(source+'/'+f);
  for(const [file,originalHash,appliedHash]of [
   ['./username-106583.patch','c2362c50531edbb4a8edc03cabb33552c83c7987ebd01979ecad602132aa0797','c2362c50531edbb4a8edc03cabb33552c83c7987ebd01979ecad602132aa0797'],
   ['./openssh-server-backport.patch','f60edd29acef1ea6c41a950c2c3bc04c649f62010eff75f0a3c16d5cbe74955d','a18dd5b649d75115936e356ea019cbb4123ce783f20dceaa8357dab468245a04'],
   ['../closure-review/openssh-client-lifetime.patch','564772341b5b2bdf71715f002d4efb5cacbf5e845b3f5116139e24f05bd525fb','564772341b5b2bdf71715f002d4efb5cacbf5e845b3f5116139e24f05bd525fb'],
  ]){
   const location=new URL(file,import.meta.url);assert.equal(sha(location),originalHash);
   const original=fs.readFileSync(location,'utf8');
   const patch=file==='./openssh-server-backport.patch'?original.replace('input_gssapi_errtok(int type, u_int32_t plen, struct ssh *ssh)','input_gssapi_errtok(int type, uint32_t plen, struct ssh *ssh)'):original;
   assert.equal(createHash('sha256').update(patch).digest('hex'),appliedHash);
   run('git',['apply','--reverse','--check','-'],{cwd:source,input:patch,stdio:['pipe','pipe','pipe']});
   run('git',['apply','--reverse','-'],{cwd:source,input:patch,stdio:['pipe','pipe','pipe']});
  }
  for(const [f,h]of Object.entries(baseline))assert.equal(sha(source+'/'+f),h,'Authenticated 10.3 source preimage: '+f);
 }else{
 run('dpkg-source',['-x',candidate+'/openssh_10.0p1-7+deb13u4+utilibre3.dsc',source]);
 const old=read(previous+'/proposal.json');
 for(const [f,h]of Object.entries(old.preservedClientSource)){assert.equal(sha(source+'/'+f),h);sourceHashes[f]=h;}
 for(const f of ['auth2-gss.c','serverloop.c','gss-serv.c','auth2.c','ssh-gss.h','monitor.c']){sourceHashes[f]=sha(source+'/'+f);assert.equal(sourceHashes[f],sha(previous+'/openssh-10.0p1/'+f));}
 assert.equal(sha(source+'/readconf.c'),'3c3e6c0c6121027bcf8ed01c6c4ebe14dfdd8bb21d46ed5d754706eaa99fdca2');sourceHashes['readconf.c']=sha(source+'/readconf.c');
 run('git',['apply','--reverse','--check',new URL('./username-106583.patch',import.meta.url).pathname],{cwd:source});
 }
}finally{fs.rmSync(temp,{recursive:true});}
const reasons={
 'CVE-2026-60002':backports?'Upstream e8bdfb151a356d0171fea4194dd205fbb252be23 client lifetime fix reapplied to exact Debian 10.3. Zero-fuzz reverse application recovers all four authenticated 10.3 preimages. Native SSH/rekey/host-key interoperability passes; not a new exploit reproduction.':'Retained e8bdfb151a356d0171fea4194dd205fbb252be23 client lifetime fix: all four affected source files are byte-identical to the earlier reviewed repair. Native SSH/rekey/host-key interoperability passes; not a new exploit reproduction.',
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
 const evidence=backports?path.relative(root,checks):'ssh-username-20261016-check';
 if(backports)assert(!evidence.startsWith('..')&&!path.isAbsolute(evidence),'10.3 review evidence must stay in protected maintenance storage');
 const limitation=backports&&['CVE-2026-59999','CVE-2026-60000'].includes(i.id)?' Earlier failing server fixture is 10.0; the passing candidate is 10.3.':'';
 decisions.push(validateDecision({key:i.key,status,expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+limitation+' Exact source, installed payload, three-package release and native-test hashes verified. Evidence: '+evidence+'/{review,native,username,proposal,release}.json. https://security-tracker.debian.org/tracker/'+i.id}));
}
fs.writeFileSync(out,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,hostScannedAt:scan.host.scannedAt||scan.date,sourceHashes,releaseSha256:sha(checks+'/release.json'),proposalSha256:sha(checks+'/proposal.json'),applied:false,decisions},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({prepared:decisions.length,applied:false,gssapiNewServerCvesFixed:false}));

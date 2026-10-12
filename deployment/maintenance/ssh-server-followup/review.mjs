// Fresh exact-key proposals only. This file never writes the private ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/ssh-server-followup-20261012';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);
assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(dir+'/release.json'),proposal=read(dir+'/proposal.json'),native=read(dir+'/native.json');
assert.equal(release.status,'passed');assert(native.passed&&native.checks.length===11);
assert(Date.parse(release.completedAt)<=Date.parse(scan.date),'Scan must include installed release');
assert.equal(sha(dir+'/proposal.json'),release.proposalSha256);assert.equal(sha(dir+'/native.json'),proposal.nativeReceiptSha256);
const payloads={'ssh':'/usr/bin/ssh','sshd':'/usr/sbin/sshd','sshd-auth':'/usr/lib/openssh/sshd-auth','sshd-session':'/usr/lib/openssh/sshd-session','sftp-server':'/usr/lib/openssh/sftp-server'};
for(const [name,path] of Object.entries(payloads))assert.equal(sha(path),proposal.payloadSha256[name]);
for(const [path,hash] of Object.entries(proposal.packages))assert.equal(sha(path),hash);
const packages=['openssh-client','openssh-server','openssh-sftp-server'];
const run=(c,a)=>cp.execFileSync(c,a,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
for(const p of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),proposal.next);
const reasons={
 'CVE-2026-59999':'Exact upstream 8dfe7ed6e2fd988de08df508355a196b956b2753 tunnel policy repair. A real TUN channel with PermitTunnel=yes/DisableForwarding=yes succeeds on the old native server and is rejected by the candidate; PermitTunnel=yes/DisableForwarding=no still succeeds. All tests use private network namespaces, loopback, and generated keys. https://github.com/openssh/openssh-portable/commit/8dfe7ed6e2fd988de08df508355a196b956b2753 ; https://security-tracker.debian.org/tracker/CVE-2026-59999 .',
 'CVE-2026-60000':'Exact upstream 5d04ca6af739b82fd30d84d2783ca802ebfa1192 GSSAPI repair plus c10e049 unused-variable cleanup. Bounded native ERRTOK regression negotiates five attempts past MaxAuthTries=3 on the old server, while the candidate disconnects at three for valid and invalid accounts; malformed TOKEN likewise enforces three. Successful real Kerberos/PAM authentication in a private realm also passes. https://github.com/openssh/openssh-portable/commit/5d04ca6af739b82fd30d84d2783ca802ebfa1192 ; https://security-tracker.debian.org/tracker/CVE-2026-60000 .',
 'CVE-2026-60002':'Retained upstream e8bdfb151a356d0171fea4194dd205fbb252be23 client lifetime fix. All four affected source files are byte-identical to the previously reviewed patched sources, and the same complete patch was applied to authenticated stable sources before the new native build. The installed client SHA256 matches the new candidate tested against both server generations, including 512 KiB byte-equal echo across 16 KiB rekeys and rejected changed-host-key paths. This is source-hunk equivalence plus runtime compatibility, not an exploit reproduction. https://github.com/openssh/openssh-portable/commit/e8bdfb151a356d0171fea4194dd205fbb252be23 ; https://security-tracker.debian.org/tracker/CVE-2026-60002 .',
};
const previous=read(root+'/ssh-closure-20261012/backport.json');
assert.equal(proposal.preservedClientCommit,previous.commit);
assert.deepEqual(Object.keys(proposal.preservedClientSource).sort(),['ssh.c','sshconnect.c','sshconnect.h','sshconnect2.c']);
for(const record of previous.records){assert.equal(proposal.preservedClientSource[record.file],record.after);assert.equal(sha(dir+'/openssh-10.0p1/'+record.file),record.after);}
assert.equal(sha(dir+'/openssh-client-lifetime.patch'),sha(root+'/ssh-closure-20261012/client-lifetime-backport.patch'));
assert(native.checks.filter(c=>c.name==='native-compatibility').every(c=>c.echoBytes===524288&&c.rekeyLimit===16384&&c.changedHostRejected));
for(const pkg of ['openssh-client','openssh-sftp-server'])assert(!run('dpkg-query',['-L',pkg]).split('\n').some(p=>/\/(sshd|sshd-auth|sshd-session)$/.test(p)));
const decisions=queue.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.type==='debian'&&packages.includes(i.package)&&i.installed===proposal.next&&Object.hasOwn(reasons,i.id)).map(i=>validateDecision({
 key:i.key,status:(i.id==='CVE-2026-60002'?i.package==='openssh-client':i.package==='openssh-server')?'mitigated':'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),
 reason:(i.id==='CVE-2026-60002'?(i.package==='openssh-client'?'Native stable client backport retained. ':'This server package does not contain the affected ssh client connection/key-exchange code; the coupled client is separately patched and tested. '):(i.package==='openssh-server'?'Native Debian stable OpenSSH server backport; ':'This exact binary package ships neither sshd nor its authentication/session helpers; the source-wide server advisory does not affect its payload. The coupled host server is separately patched and tested. '))+reasons[i.id]+' Candidate and live hashes match the retained package payloads. Baseline/candidate client interoperability, repeated 16 KiB rekeys, SFTP, TCP forwarding, PAM and rejected-host-key paths pass; Debian dependencies/configurations/keys are retained. Evidence: ssh-server-followup-20261012/{backport,native,proposal,release}.json. This covers only this advisory and these exact host package versions.'
}));
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false,cves:Object.keys(reasons)}));

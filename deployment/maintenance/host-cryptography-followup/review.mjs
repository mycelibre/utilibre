// Evidence-bound host-only decisions; never write the shared security ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/host-cryptography-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(dir+'/release.json'),checks=read(dir+'/checks.json');assert.equal(release.status,'passed');assert(checks.passed);
assert(Date.parse(release.completedAt)<=Date.parse(scan.date),'Fresh scan must include this release');
assert.equal(sha(dir+'/checks.json'),release.checksSha256);
cp.execFileSync(process.execPath,[here+'verify-source.mjs'],{stdio:'pipe'});
assert.equal(cp.execFileSync('dpkg-query',['-W','-f=${Version}','python3-cryptography'],{encoding:'utf8'}),'43.0.0-3+deb13u1+utilibre1');
assert.equal(sha('/usr/lib/python3/dist-packages/cryptography/hazmat/bindings/_rust.abi3.so'),release.newRustSha256);
assert.equal(sha(dir+'/build/python3-cryptography_43.0.0-3+deb13u1+utilibre1_amd64.deb'),release.newPackageSha256);
assert.equal(checks.old.budgetEnforced,false);
for(const proof of [checks.candidate,release.live])assert(proof.passed&&proof.budgetEnforced&&proof.constrainedWildcardsRejected===2&&proof.unconstrainedWildcardPreserved&&proof.localRequestsPyOpenSSLTLS&&proof.jwtES256&&proof.acmeChallenge);
assert.deepEqual(checks.changedFiles,['hazmat/bindings/_rust.abi3.so']);
const reasons={
 'CVE-2026-69249':['mitigated','Native Debian 43.0.0 same-series rebuild includes the exact maintained Oracle/RHEL 43.0.0 signature-verification budget backport (source RPM SHA256 336512154cea176d809879f11ea4ca3a5e06395e981c362fce49394589679c43; patch SHA256 73c1bab19c17e9d0b45cf4d2f4d5f2c202cae72c48ad3f016bc1749c447fe5af). It bounds issuer signature checks to 128 and orders candidates by AKI/SKI. Synthetic baseline has no budget; candidate/live reject 140 wrong-signing-key issuer candidates with the budget error and still find a valid matching issuer behind them. Native Rust/Python suites and host consumer tests pass, exact live artifact matches proof. https://linux.oracle.com/errata/ELSA-2026-71658.html ; https://github.com/pyca/cryptography/commit/4a12cf49675a184e47f912b00b04f3a629283582 .'],
 'CVE-2026-34073':['not-affected','This host remains cryptography 43.0.0 with the existing strict DNSName constraint parser, not the later DNSPattern constraint implementation introduced by 286c89128896fc043c68d9061891badbdfa25dd2. A synthetic intermediate excluding bar.example.test with a *.example.test leaf is rejected as an unsatisfiable malformed wildcard SAN on baseline, candidate and live bytes. Ordinary unconstrained wildcard validation and valid chains pass. Ubuntu identifies the introducing commit and earlier-series non-applicability: https://ubuntu.com/security/CVE-2026-34073 . This does not claim all certificate validation problems are absent.'],
 'CVE-2026-69248':['not-affected','The documented wildcard permittedSubtrees defect affects 45.0.0 through 48.0.0; this host remains native 43.0.0. Source uses DNSName::new for constrained SANs rather than the later vulnerable DNSPattern matcher. A synthetic intermediate permitting foo.example.test with a *.example.test leaf is rejected as an unsatisfiable malformed wildcard SAN on baseline, candidate and live bytes, with normal unconstrained wildcards preserved. https://ubuntu.com/security/CVE-2026-69248 ; https://github.com/pyca/cryptography/security/advisories/GHSA-m2h6-j472-rp4c . Exact artifact and narrow source evidence take precedence over the advisory broad <=48 package banner; this is host-only.']
};
const selected=queue.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.type==='debian'&&i.package==='python3-cryptography'&&i.installed==='43.0.0-3+deb13u1+utilibre1'&&reasons[i.id]);
for(const [kind,filename]of [['mitigated','review-mitigated.json'],['not-affected','review-not-affected.json']]){
 const decisions=selected.filter(i=>reasons[i.id][0]===kind).map(i=>validateDecision({key:i.key,status:kind,expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reasons[i.id][1]+' Evidence: host-cryptography-followup-20261012/release.json. No independent container environments are covered.'}));
 fs.writeFileSync(dir+'/'+filename,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,packageSha256:release.newPackageSha256,rustSha256:release.newRustSha256,checksSha256:release.checksSha256},null,2)+'\n');
 console.log(JSON.stringify({filename,prepared:decisions.length,applied:false}));
}

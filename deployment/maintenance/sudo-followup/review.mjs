// Propose only CVE-2026-96512 exact-key mitigations after a fresh scan. Never
// writes the private decision ledger or changes raw scanner findings.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {eligible} from './review-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/sudo-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(c,a)=>cp.execFileSync(c,a,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']}).trim();
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
run('node',[here+'verify-source.mjs']);
const offers=read(dir+'/source-offer.json');assert(offers.published);assert.equal(offers.sha256,'0f26666dd28dc3b9a99b83e1752f28723409f19b8b1a7ac49f7676d6a745d26c');assert.equal(sha(offers.archive),offers.sha256);
const host=read(dir+'/host-release.json'),hostNative=read(dir+'/trixie/output/native.json');assert.equal(host.status,'passed');assert.equal(sha(dir+'/host-checks.json'),host.checksSha256);assert.equal(sha(dir+'/trixie/output/native.json'),host.nativeSha256);
assert(Date.parse(host.completedAt)<=Date.parse(scan.date));assert.equal(run('dpkg-query',['-W','-f=${Version}','sudo']),host.version);
for(const row of hostNative.abi)assert.equal(sha(row.path),row.sha256);
const specs=[{scope:'host-os',native:hostNative,release:host,artifact:null,container:null}];
if(fs.existsSync(dir+'/kuma-release.json')){
 const release=read(dir+'/kuma-release.json');assert.equal(release.status,'passed');assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
 const build=read(dir+'/kuma-build.json'),native=read(dir+'/bookworm/output/native.json'),application=read(dir+'/kuma-application.json');
 assert.equal(release.proofs.native,sha(dir+'/bookworm/output/native.json'));assert.equal(release.proofs['kuma-build'],sha(dir+'/kuma-build.json'));assert.equal(release.proofs['kuma-application'],sha(dir+'/kuma-application.json'));assert(application.passed&&application.nativeSetupLogin&&application.noNotificationSent);assert.equal(application.imageId,build.imageId);
 const container='utilibre-community-uptime-kuma-1';let artifact=build.imageId;
 const chain=additionalOverlayReceipts.filter(file=>fs.existsSync(root+'/'+file)).flatMap(file=>overlayRows(read(root+'/'+file))).filter(row=>row.name===container).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
 for(const row of chain)if(row.oldImage===artifact){assert(Date.parse(row.completedAt)<=Date.parse(scan.date));artifact=row.newImage;}
 assert.equal(run('docker',['inspect',container,'--format','{{.Image}}']),artifact,'Only an explicitly completed exact-role overlay chain may inherit this repair');
 assert.equal(run('docker',['exec',container,'dpkg-query','-W','-f=${Version}','sudo']),native.version);
 for(const row of native.abi)assert.equal(run('docker',['exec',container,'sha256sum',row.path]).split(/\s+/)[0],row.sha256);
 specs.push({scope:'runtime-image',native,release,artifact,container});
}
const decisions=[];
for(const spec of specs){
 assert(spec.native.helper.startsWith('SUDO_ENVIRONMENT_HELPERS_PASSED:'));assert(spec.native.upstreamResults.every(r=>r.errors===0&&r.success===100));assert.equal(spec.native.configs.length,7);assert.equal(spec.native.abi.length,14);
 for(const item of queue.items.filter(i=>eligible(i)&&i.scope===spec.scope&&(spec.scope==='host-os'||i.artifact===spec.artifact))){
  decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Native Debian ${spec.native.version} includes both official sudo timezone fixes db669167 and 1820a349; first fix alone is not sufficient. Original plugin environment is retained while working TZ is removed before time checks. Actual repaired functions pass a benign non-root native check; both full upstream build variants pass, and all 14 exact live ELF hashes match the tested candidate with stable exports/dependencies and unchanged PAM/config. No authentication or escalation test was performed. https://github.com/sudo-project/sudo/commit/1820a349687522f51023d1ae5925125f59679a8c ; https://security-tracker.debian.org/tracker/CVE-2026-96512 . Only this advisory/exact package-role artifact is covered. Evidence: sudo-followup-20261012 native and completed release receipts; raw scan findings retained.`}));
 }
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false,cves:['CVE-2026-96512']}));

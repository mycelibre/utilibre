// Post-activation evidence only. Installing on disk cannot clear this review.
import fs from 'node:fs';import cp from 'node:child_process';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
import{proveHostExpat}from'./expat-host-proof.mjs';
import{resetAdvisory,proofPath,validateResetProof}from'../security-20261104/expat-reset-proof.mjs';import{freshScan}from'../review-native-backports.mjs';import{validateDecision}from'../triage.mjs';
process.umask(0o077);const reset=process.argv[2]==='--reset-advisory',amplification=process.argv[2]==='--amplification-advisory';assert(process.argv.length===2||(process.argv.length===3&&(reset||amplification)));
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/expat-host',read=p=>JSON.parse(fs.readFileSync(p));
const scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const {spec,current}=proveHostExpat(scan);
if(reset)for(const hash of Object.values(spec.librariesBySuite.trixie))validateResetProof(read(proofPath),hash);
if(amplification){
 // Reuse the same authenticated upstream release evidence as the container
 // reviewer. proveHostExpat above separately checks the complete host package
 // and resident mappings; an on-disk version string is insufficient.
 const source=read(new URL('./expat-bookworm-source.json',import.meta.url));
 const pin=source.sources.files.find(f=>f.file==='expat_2.10.0.orig.tar.gz');assert(pin);
 const archive=root+'/security-20261103/packages/debian/'+pin.file;
 const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 assert.equal(sha(archive),pin.sha256);
 const paths=cp.execFileSync('tar',['-tzf',archive],{encoding:'utf8',timeout:15000}).split('\n').filter(p=>p.endsWith('/Changes'));assert.equal(paths.length,1);
 const changes=cp.execFileSync('tar',['-xOf',archive,paths[0]],{encoding:'utf8',timeout:15000});
 assert.match(changes,/Release 2\.10\.0[\s\S]*CVE-2026-115506 -- Detect billion laughs attacks quicker/);
 const build=read(root+'/security-20261103/expat-bookworm/output/build.json');
 assert(build.passed&&build.nativeSuite.checks===5328&&build.nativeSuite.failed===0);
 assert.equal(build.packageSha256,spec.packages.bookworm.sha256);
 assert.equal(sha(root+'/security-20261103/expat-bookworm/output/native-tests.log'),build.nativeSuite.sha256);
}

const decisions=q.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.package==='libexpat1'&&i.installed===spec.packages.trixie.version&&(reset?[resetAdvisory]:amplification?['CVE-2026-115506']:spec.advisories).includes(i.id)).map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Authenticated Expat ${i.installed} fixes ${i.id}. Complete host payload matches the reviewed package; narrow/wide ABI, small native parsers, actual Python binding and private D-Bus consumer tests pass. All observed host Expat mappings match the candidate, with no deleted-library mapping; the system bus is active. No large-memory exploit or universal consumer test is claimed. ${amplification?'The checksum-pinned upstream 2.10.0 Changes explicitly identifies this correction; retained upstream tests passed 5328 checks. No new amplification test was run. ':''}${reset?'The 64-KiB reset fixture fails on 2.9.0 and passes on both exact 2.10.0 libraries; proof: security-20261104/expat-reset.json. ':''}Evidence: security-20261103/expat-host/{prepared,stage,release,review}.json. Only this exact host/package/advisory is covered; raw findings retained. https://security-tracker.debian.org/tracker/${i.id}`}));
fs.writeFileSync(dir+(reset?'/review-reset.json':amplification?'/review-amplification.json':'/review.json'),JSON.stringify({schemaVersion:1,date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,current,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));

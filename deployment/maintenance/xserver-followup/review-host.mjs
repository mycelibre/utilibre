// Three exact source fixes, host packages only; write drafts, never the ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {current,packages,pins,binary,fixes,nativeGate,eligible} from './host-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/xserver-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(dir+'/host-release.json'),proof=read(dir+'/host-checks.json');assert.equal(release.status,'passed');assert(proof.passed);assert.equal(release.version,current);
assert(Date.parse(release.completedAt)<=Date.parse(scan.date),'Scan must start after this release');assert.equal(sha(dir+'/host-checks.json'),release.checksSha256);
for(const recipe of release.recipes)assert.equal(sha(here+recipe.file),recipe.sha256,'Reviewed recipe changed');
nativeGate(proof.baseline,'old');nativeGate(proof.candidate,'new');nativeGate(release.live,'new');assert.deepEqual(release.fixes,fixes);
for(const p of packages){
 assert.equal(cp.execFileSync('dpkg-query',['-W','-f=${Version}',p],{encoding:'utf8'}),current);
 assert.equal(sha(`${dir}/packages/${p}_${current.replace(':','%3a')}_${pins[p].architecture}.deb`),pins[p].new);
}
assert.equal(sha('/usr/bin/Xvfb'),binary.new);assert.equal(release.newFiles.length,13);
for(const row of release.newFiles){const s=fs.lstatSync(row.file);assert.equal(s.mode&0o7777,row.mode);if(row.link!==undefined){assert(s.isSymbolicLink());assert.equal(fs.readlinkSync(row.file),row.link);}else{assert(s.isFile());assert.equal(sha(row.file),row.sha256);}}
for(const archive of release.sourceArchives)assert.equal(sha(dir+'/sources/'+archive.file),archive.sha256);
for(const [id,fix]of Object.entries(fixes))assert.equal(sha(dir+'/'+id+'.patch'),fix.sha256);
const details={
 'CVE-2026-88812':'The isolated authenticated XKB malformed-font cleanup fixture crashes the old host executable; candidate and live executable reject it with BadValue and continue serving.',
 'CVE-2026-93523':'The isolated authenticated XInput2 fixture rejects invalid modifier 256 on candidate/live while preserving valid modifier 0 and native pixel rendering; the baseline accepts the invalid modifier.',
 'CVE-2026-93521':'The signed fixed package and exact upstream RandR fix were verified in a fresh extracted corresponding-source tree. Xvfb reports zero RandR providers, so provider mutation is NOT reproduced by the native fixture; this is not a claimed exploit regression test.'
};
const decisions=queue.items.filter(eligible).map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Host-only authenticated Debian xvfb/xserver-common ${current} upgrade. Every installed package file matches the signed-archive payload (Xvfb SHA256 ${binary.new}); complete source is retained and exact upstream commit ${fixes[i.id].commit} reverse-applies. ${details[i.id]} The release changed exactly two native packages, preserved 28 dependency libraries and service PIDs, and passed clean dpkg audit. https://security-tracker.debian.org/tracker/${i.id} ; https://gitlab.freedesktop.org/xorg/xserver/-/commit/${fixes[i.id].commit} . Evidence: xserver-followup-20261012/host-release.json. This does not cover CVE-2023-5574, other source-wide findings, or any container image.`}));
assert.equal(read(root+'/security.json').completedAt,scan.completedAt,'Concurrent scan changed');assert.equal(read(root+'/security-queue.json').scanDate,queue.scanDate);
fs.writeFileSync(dir+'/host-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,releaseSha256:sha(dir+'/host-release.json'),binarySha256:binary.new},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,status:'mitigated',applied:false,scope:'Three exact host Xserver fixes only'}));

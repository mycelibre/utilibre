// Revalidate the exact native host release; no source-wide or version-only waiver.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {inventory} from '../component-followup/inventory.mjs';import {validatePayload} from '../vendor-leaves-final/dhi-proof.mjs';import {freshScan} from '../review-native-backports.mjs';import {validateDecision} from '../triage.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103/host-libraries',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const scan=read(root+'/security.json'),q=read(root+'/security-queue.json');freshScan(q,scan);assert.equal(scan.status,'checked');assert.equal(scan.host.status,'checked');
const release=read(dir+'/release.json'),spec=read(new URL('./host-library-inputs.json',import.meta.url));assert.equal(release.status,'passed');assert(release.noServiceRestart&&release.native.passed&&release.native.sqliteBackupRestore&&release.native.sqliteCorruptFtsRejected&&release.native.xiHostLoad);assert(Date.parse(release.completedAt)<Date.parse(scan.date));
const sql=read(root+'/security-20261103/sqlite/trixie/output/build.json');assert(sql.passed&&sql.baselineReproduced&&sql.afterSanitizersPassed&&sql.distinctTests>=87&&sql.prefixTests>=30);
const allowed={'libxi6':['CVE-2026-109089','CVE-2026-109090'],'libsqlite3-0':['CVE-2026-119373','CVE-2025-7458','CVE-2026-11822','CVE-2026-11824']};
const proofs=[],decisions=[];
for(const p of spec.packages){
 const row=release.rows.find(r=>r.package===p.package);assert(row);assert.equal(sha(p.candidateFile),p.candidateSha256);assert.equal(sha(p.library),p.librarySha256);
 const actual=inventory(p.package);assert.equal(actual.installed,p.after);validatePayload(row.newPayload,actual.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path)));
 if(p.package==='libsqlite3-0')assert.equal(p.librarySha256,sql.librarySha256);
 proofs.push({package:p.package,version:p.after,librarySha256:p.librarySha256,archiveSha256:p.candidateSha256});
 for(const i of q.items.filter(i=>i.status==='needs-review'&&i.scope==='host-os'&&i.artifact==='host-dpkg'&&i.type==='debian'&&i.package===p.package&&i.installed===p.after&&allowed[p.package].includes(i.id))){
  const basis=p.package==='libxi6'?'Official authenticated Debian libXi 1.8.4 fixes the two response-size/type advisories. Native isolated XInput discovery/allocation and original ABI checks pass; host loading was also checked. No malicious-X-server exploit reproduction is claimed.':'The exact native SQLite negative-rowid backport fixes the sanitizer-reproduced overflow while preserving earlier DISTINCT/FTS fixes. Both source sanitizer baselines fail for the intended reason; fixed source and 87 DISTINCT/30 prefix cases pass. Host negative-rowid, legitimate queries, synthetic backup/restore and corrupt-FTS rejection pass.';
  decisions.push(validateDecision({key:i.key,status:p.package==='libxi6'?'not-affected':'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`${basis} Every installed package file matches the tested archive and completed two-package release. Only ${p.package} ${p.after}, this host and ${i.id} are covered. Raw distribution-version findings remain. Evidence: security-20261103/host-libraries/{prepared,release,review}.json; https://security-tracker.debian.org/tracker/${i.id}`}));
 }
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,proofs,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));

import assert from 'node:assert/strict';
export function proveSqlite(s,b,n,source){
 assert.equal(b.base,s.base);assert.equal(b.version,s.version);assert.equal(b.candidate,s.candidate);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.applicationSha256&&b.unrelatedLibrariesSha256);
 assert(n.passed&&n.imageId===b.imageId&&n.base===s.base&&n.abiPreserved&&n.neededPreserved&&n.compileOptionsUnchanged);
 assert.equal(n.rows.length,2);
 for(const r of n.rows)assert(r.passed&&r.previousDistinctChecks===5&&r.syntheticBackupRestore&&r.corruptFtsRejected);
 assert(n.rows[1].negativeRowidOutcome==='passed'&&n.rows[1].negativeRowidChecks===9);
 assert(n.rows[0].negativeRowidOutcome==='passed'&&n.rows[0].negativeRowidChecks===9||n.rows[0].negativeRowidOutcome==='allocator-failure'&&n.rows[0].negativeRowidChecks===0);
 assert.deepEqual(n.rows.map(r=>r.imageId),[s.base,b.imageId]);
 assert.equal(source.suite,s.suite);assert(source.passed&&source.upstreamSourceFix&&source.baselineReproduced&&source.afterSanitizersPassed);
 assert(source.prefixTests>0&&source.distinctTests>=87&&source.nativePackagingUnchanged);
 assert.equal(b.sourceReceiptSha256,n.sourceReceiptSha256);
 assert.equal(b.librarySha256,source.librarySha256);
 assert.equal(n.abi[1].sha256,b.librarySha256);
 for(const p of b.packages){assert.equal(p.version,s.version);assert.equal(p.sha256,source.packages[p.name].sha256);}
 return true;
}
export function sqliteComparison(v){
 // The backport preserves the version branch. Compare the same unresolved
 // advisories across package revisions, without discarding them from reports.
 return JSON.stringify(['libsqlite3-0','sqlite3'].includes(v.package)?{...v,installed:'verified-sqlite-rowid-backport'}:v);
}

export const sqliteReview='security-20261103/sqlite/review.json';
export function sqliteEligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&['libsqlite3-0','sqlite3'].includes(i.package)&&['3.40.1-2+deb12u2+utilibre3','3.46.1-7+deb13u2+utilibre1'].includes(i.installed)&&['CVE-2026-119373','CVE-2025-7458','CVE-2026-11822','CVE-2026-11824'].includes(i.id)&&Array.isArray(i.containers)&&i.containers.length>0;}

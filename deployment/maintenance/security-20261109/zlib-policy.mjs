// Exact signed-package acceptance. A scanner result alone never grants approval.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const local=p=>new URL(p,import.meta.url);
export function proveZlib(i,s,b,c,scan,scope){
 assert.equal(s.releaseApproval,'approved');assert(!s.ownerHold);assert.equal(s.approval,'approved');
 for(const p of [b,c,scan,scope])assert(p.passed&&p.base===s.base&&p.imageId===b.imageId);
 assert.equal(b.candidate,s.candidate);assert(b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.applicationBytesUnchanged);
 assert(scope.allUnrelatedImageFilesUnchanged&&scope.unrelatedApkRecordsUnchanged&&scope.muslUnchanged&&scope.zlibAbiPreserved&&scope.baselineExportedSymbols>=80);
 assert.equal(b.scopeSha256,sha(scope.path));
 assert.deepEqual(b.package,i.packages[s.branch]);assert.equal(b.package.version,'1.4-r0');
 assert.equal(sha(local(i.nativeFixture.source)),i.nativeFixture.sourceSha256);
 assert.deepEqual(b.nativeFixture,i.nativeFixture);assert.deepEqual(b.nativeRows.map(r=>r.imageId),[s.base,b.imageId]);assert(b.nativeRows.every(r=>r.passed&&r.checks===7));
 assert.deepEqual(c.nativeRows,b.nativeRows);assert.equal(c.profile,s.consumerProfile);
 const counts={'node-runtime':11,'php-runtime':8,'postgres-runtime':6,'redis-runtime':6,'proxy-native':{'reader-evaluation-gothub':3,'reader-evaluation-safetwitch-backend':2}[s.evidenceKey||s.key],'native-app':{'community-ntfy':9,'opengist-opengist':6}[s.evidenceKey||s.key],'special-native':{'pack-galene-galene':3,'additions-fmd':7,'binternet-onion-tor':5}[s.evidenceKey||s.key]};
 assert(counts[s.consumerProfile]);assert.deepEqual(c.rows.map(r=>r.imageId),[s.base,b.imageId]);assert(c.rows.every(r=>r.passed&&r.checks===counts[s.consumerProfile]));assert.deepEqual(c.rows.map(({imageId,...r})=>r)[0],c.rows.map(({imageId,...r})=>r)[1]);
 if(s.consumerProfile==='postgres-runtime')assert(c.rows.every(r=>r.nativeDumpRestore));
 const fixture=s.consumerProfile==='special-native'?'check-musl-special.py':['proxy-native','native-app'].includes(s.consumerProfile)?'check-musl-proxy.py':'check-musl-runtimes.py';
 assert.equal(c.fixtureSha256,i.consumerFixtureHashes[fixture]);assert.equal(sha(local(fixture)),c.fixtureSha256);
 assert.equal(c.adapter.originalSha256,c.fixtureSha256);assert.equal(sha(c.adapter.path),c.adapter.sha256);
 if(c.applicationFixture){assert.equal(sha(local('../'+c.applicationFixture)),c.applicationFixtureSha256);}
 for(const [f,h]of Object.entries(c.supportingFixtureHashes||{}))assert.equal(sha(local(f)),h);
 assert.equal(scan.consumerSha256,sha(c.path));assert(scan.nativeApkInventoryComplete&&scan.targetedFindingRemoved&&scan.newHighCritical===0);
 assert.equal(scan.databaseSha256,i.databaseSha256);assert.equal(sha(scan.rawPath),scan.rawCandidateScanSha256);
 assert.equal(scan.baselineScanSha256,s.baselineRawScan?.sha256||i.baselineScanSha256);
}

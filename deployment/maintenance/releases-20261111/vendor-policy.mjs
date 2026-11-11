// Release authority is explicit and separate from scanner results.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const hash = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const root = '/var/lib/utilibre-maintenance/vendor-libs-20261111';
const maintenance = fileURLToPath(new URL('../', import.meta.url));

export function proveVendor(inputs, s, b, scope, c, scan, now = Date.now()) {
 assert.equal(inputs.schemaVersion, 1);
 assert.equal(s.releaseApproval, 'approved');
 assert.equal(s.approval, 'preparation-only');
 assert(!s.ownerHold);
 assert(/^sha256:[a-f0-9]{64}$/.test(b.imageId));
 assert.equal(b.candidate, s.candidate);
 for (const proof of [b, scope, c, scan]) {
  assert.equal(proof.passed, true);
  assert.equal(proof.base, s.base);
  assert.equal(proof.imageId, b.imageId);
 }
 assert(b.configurationUnchanged && b.unrelatedPackagesUnchanged && b.applicationBytesUnchanged);
 assert(scope.allUnrelatedImageFilesUnchanged && scope.unrelatedApkRecordsUnchanged && scope.muslUnchanged);
 assert(scope.abi.length && scope.abi.every(r => r.preserved && r.baselineSymbols > 0));
 assert.deepEqual(scope.packages, Object.keys(s.packages).sort());
 assert.deepEqual(Object.keys(s.packages).sort(), 'krb5-libs' in s.packages ? ['krb5-libs','libxslt'] : ['libxslt']);
 assert(['3.22','3.23','3.24'].includes(s.branch));
 assert.equal(s.packages.libxslt, '1.1.43-r3');
 assert.equal(inputs.packages[s.branch+'/libxslt'].version, '1.1.43-r4');
 if ('krb5-libs' in s.packages) {
  assert.equal(s.packages['krb5-libs'], '1.22.2-r1');
  assert.equal(inputs.packages[s.branch+'/krb5-libs'].version, '1.22.3-r0');
  assert.equal(s.consumerProfile, 'postgres-runtime');
 }
 assert.deepEqual(b.pins, Object.keys(s.packages).map(n => inputs.packages[s.branch+'/'+n]));
 assert.deepEqual(b.nativeFixture, inputs.nativeFixture);
 assert.deepEqual(b.nativeRows.map(r => r.imageId), [s.base, b.imageId]);
 const expected = {'xslt-native':'XSLT_NATIVE_PASSED parse-transform-sort-parameter-utf8-serialize'};
 if ('krb5-libs' in s.packages) expected['kerberos-native'] = 'KERBEROS_NATIVE_PASSED checks=15';
 for (const r of b.nativeRows) { assert(r.passed); assert.deepEqual(r.results, expected); }
 assert.deepEqual(c.nativeRows, b.nativeRows);
 const checks = {'static-nginx':9,'nginx-runtime':9,'postgres-runtime':6,'php-runtime':8,'special-native':9};
 assert(s.consumerProfile in checks);
 if (s.consumerProfile === 'special-native') assert.equal(s.evidenceKey || s.key, 'kittygram-kittygram');
 assert.equal(c.profile, s.consumerProfile);
 assert.deepEqual(c.rows.map(r => r.imageId), [s.base, b.imageId]);
 assert(c.rows.every(r => r.passed && r.checks === checks[s.consumerProfile]));
 assert.deepEqual(c.rows.map(({imageId, ...r}) => r)[0], c.rows.map(({imageId, ...r}) => r)[1]);
 if (s.consumerProfile === 'postgres-runtime') assert(c.rows.every(r => r.nativeDumpRestore));
 assert(scan.nativeApkInventoryComplete && scan.targetedFindingRemoved);
 assert.equal(scan.newHighCritical, 0);
 assert.equal(scan.databaseSha256, inputs.databaseSha256);
 assert.equal(scan.baselineScanSha256, inputs.baselineScanSha256);
 assert.deepEqual([...new Set(scan.baselineTargets.map(r => r.id))].sort(), s.advisories);
 const age = now - Date.parse(scan.advisoryUpdatedAt);
 assert(Number.isFinite(age) && age >= 0 && age < inputs.maximumDatabaseAgeHours*3600000);
}

export function verifyVendorRelease(inputs, s, b, scope, consumer, scan, dir) {
 proveVendor(inputs, s, b, scope, consumer, scan);
 assert.equal(dir, root+'/'+(s.evidenceKey || s.key));
 for (const [p, sha] of Object.entries(inputs.fixtureHashes)) assert.equal(hash(maintenance+p), sha, 'Checker changed: '+p);
 for (const [p, sha] of Object.entries(inputs.verificationHashes)) assert.equal(hash(maintenance+p), sha, 'Release adapter changed: '+p);
 assert.equal(hash(root+'/baseline-scan.json'), inputs.baselineScanSha256);
 assert.equal(hash(root+'/scan-cache/db/trivy.db'), inputs.databaseSha256);
 assert.equal(hash(root+'/scan-cache/java-db/trivy-java.db'), inputs.javaDatabaseSha256);
 assert.equal(hash(dir+'/scope.json'), b.scopeSha256);
 assert.equal(hash(dir+'/consumer.json'), scan.consumerSha256);
 assert.equal(hash(dir+'/after-scan.json'), scan.rawCandidateScanSha256);
 for (const [p, sha] of Object.entries(s.reviewedEvidence)) assert.equal(hash(dir+'/'+p), sha, 'Reviewed evidence changed');
 for (const [name, sha] of Object.entries(inputs.nativeFixture.binaries)) assert.equal(hash(root+'/fixture/'+name), sha);
 for (const p of [consumer, scan]) {
  assert(p.adapter.path.startsWith(root+'/adapters/'));
  assert.equal(hash(p.adapter.path), p.adapter.sha256);
  assert.equal(hash(p.adapter.originalFixture), p.adapter.originalSha256);
 }
}

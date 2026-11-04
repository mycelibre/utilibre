import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=file=>createHash('sha256').update(fs.readFileSync(new URL(file,import.meta.url))).digest('hex');
export function proveGuava(s,b,n,a){
 assert(b.passed&&b.configurationUnchanged&&b.singleLayerSingleFileVerified);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert.deepEqual(b.changedFiles,[s.jar]);assert(b.unchangedOtherAppFiles>50000);
 assert.equal(b.inputsSha256,sha('./guava-inputs.json'));
 assert.equal(b.recipeSha256,sha('./guava-build.py'));
 assert.equal(n.fixtureSha256,sha('./GuavaSerializationCheck.java'));
 assert.equal(b.fixtureSha256,n.fixtureSha256);assert.equal(n.jarSha256,b.jarSha256);
 assert(n.passed&&n.network==='none'&&n.maxHeapMiB===128&&n.rows.length===20);
 for(const state of ['baseline','fixed'])for(const namespace of ['com.google.common.collect','com.google.javascript.jscomp.jarjar.com.google.common.collect'])for(const kind of ['CompactHashSet','CompactLinkedHashSet','CompactHashMap','CompactLinkedHashMap','MapMaker']){
  const rows=n.rows.filter(r=>r.state===state&&r.namespace===namespace&&r.kind===kind);
  assert.equal(rows.length,1);const r=rows[0];assert(r.passed&&r.legitimateChecks===5);
  assert.equal(r.outOfMemory,state==='baseline');assert.equal(r.fixed,state==='fixed');
 }
 assert(a.passed&&a.version==='2.18.3'&&a.network==='isolated-internal');
 assert.equal(a.imageId,b.imageId);assert(a.twoAccounts&&a.nativeExportImport&&a.membershipChecks&&a.pngExport&&a.backendMedia&&a.cleanupVerified);
 assert(a.closureCompilerParity&&a.closureNetwork==='none');
}

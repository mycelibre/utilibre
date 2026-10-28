import assert from 'node:assert/strict';

export function nativeProof(s,b) {
 assert(b.passed&&b.configurationUnchanged);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert.deepEqual(b.changedFiles,s.files.map(f=>s.site+'/'+f.path).sort());
 for(const [name,fixed]of [['baseline',false],['native',true]]){
  const n=b[name];assert(n.passed&&n.network===false&&n.realCredentials===false);
  assert.deepEqual(n.rows.map(r=>r.format),['cjs','esm']);
  for(const r of n.rows){
   assert(r.passed&&r.normalChecks===7&&r.syntheticTransportOnly);
   assert.equal(r.sanitized,fixed);assert.equal(r.configRejected,fixed);
   assert.deepEqual(r.queryRejections,[fixed,fixed,fixed]);
  }
 }
}
export function proveMsal(s,b,v,c,a) {
 nativeProof(s,b);
 assert(v.passed&&v.imageId===b.imageId&&v.unchangedFiles>0);
 assert.deepEqual(v.changedPaths,b.changedFiles);
 assert(c.passed&&c.imageId===b.imageId&&c.network===false);
 assert.deepEqual(c.rows.map(r=>r.imageId),[s.base,b.imageId]);
 for(const r of c.rows)assert(r.passed&&r.azureCredential&&r.azureTokenCache&&r.nativeMssqlModule&&r.monitorChecks===4&&r.network===false&&r.realCredentials===false);
 assert(a.passed&&a.imageId===b.imageId&&a.network==='none'&&a.fictionalDataOnly&&a.nativeSetupLogin&&a.noNotificationSent);
}

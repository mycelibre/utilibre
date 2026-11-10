import assert from 'node:assert/strict';
const sources={
 wallabag:['979468e41c5882435793215112a5d9db54715df4','v5.4.56','26c054a37f6bb84f7a433741dd9a174a2093a9a510eb10e20ac7da289a321d03'],
 pollaris:['ed012bfca0f7b45d97016efcdf9b0639c52a1722','v7.4.23','f3559fd189003653de61f26cedb533962833b8be2e204df0278f4831d9d0a1fb'],
};
export function proveHttpClientSource(input,s,b,fixtureHash){
 assert.equal(input.schemaVersion,1);assert.deepEqual(input.advisories,['CVE-2026-121971']);
 assert.deepEqual([s.source.commit,s.source.tag,s.source.sha256],sources[s.key]);
 assert.equal(s.source.url,`https://raw.githubusercontent.com/symfony/http-client/${s.source.commit}/ScopingHttpClient.php`);
 assert.equal(s.files.length,1);assert.equal(s.files[0].path,'http-client/ScopingHttpClient.php');
 assert.equal(s.files[0].afterSha256,s.source.sha256);assert.equal(s.site,'/app/vendor/symfony');
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.match(b.imageId,/^sha256:[a-f0-9]{64}$/);
 assert(b.passed&&b.configurationUnchanged&&b.upstreamSourceVerified);
 assert.equal(b.credentialLeakReproduction,false);assert.equal(b.fixtureSha256,fixtureHash);assert.equal(input.fixtureSha256,fixtureHash);
 assert.deepEqual(b.changedFiles,['/app/vendor/symfony/http-client/ScopingHttpClient.php']);
 for(const [name,hash]of [['baseline',s.files[0].beforeSha256],['native',s.files[0].afterSha256]]){
  const p=b[name];assert(p.passed&&p.normalChecks===20&&p.network==='none');
  assert.equal(p.credentialLeakReproduction,false);assert.equal(p.sourceSha256,hash);
 }
 return true;
}
export function proveHttpClientRelease(input,s,b,v,a,g,fixtureHash,appFixtureHashes){
 proveHttpClientSource(input,s,b,fixtureHash);assert.equal(s.approval,'approved');
 assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,b.changedFiles);
 assert(a.passed&&a.imageId===b.imageId);
 assert.deepEqual(appFixtureHashes,input.applicationFixtures[s.key]);
 assert(g.passed&&g.imageId===b.imageId&&g.primarySourceFixVerified&&g.newHighCritical===0);
 assert.match(g.databaseSha256,/^[a-f0-9]{64}$/);
 if(s.key==='pollaris'){
  assert(a.twoSessions&&a.pollDeleted&&a.workerStarted&&a.externalBrowserRequests===0);
  assert.equal(a.network,'No external interface; shared loopback namespace');
 }else{
  assert.equal(a.network,'none');assert.equal(a.proofs.length,2);
  assert.deepEqual(new Set(a.proofs.map(p=>p.imageId)),new Set([b.base,b.imageId]));
  assert(a.proofs.every(p=>p.passed&&p.checks===26&&p.accounts===2));
 }
 return true;
}

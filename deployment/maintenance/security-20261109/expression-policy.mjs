import assert from 'node:assert/strict';
const sources={
 wallabag:['f371786ec76ca4bed6a7ec03802ba2525f6714db','v5.4.54','46bf564570f37a879d8254a2ebe9d3f4cadafe40c2043dbd139ac0358ceb844e'],
 pollaris:['51c52817a02119ecd46a3369a2b38fc7f24dbf5e','v7.4.21','1949f0a67e60af1d4ddcb337c89baf641c2ab6c1455727641076ef46a68949ac'],
};
export function proveExpressionSource(input,s,b,fixtureHash){
 assert.equal(input.schemaVersion,1);assert.deepEqual(input.advisories,['CVE-2026-109449']);
 assert.deepEqual([s.source.commit,s.source.tag,s.source.sha256],sources[s.key]);
 assert.equal(s.source.url,`https://raw.githubusercontent.com/symfony/expression-language/${s.source.commit}/Parser.php`);
 assert.equal(s.files.length,1);assert.equal(s.files[0].path,'expression-language/Parser.php');
 assert.equal(s.files[0].afterSha256,s.source.sha256);assert.equal(s.site,'/app/vendor/symfony');
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.match(b.imageId,/^sha256:[a-f0-9]{64}$/);
 assert(b.passed&&b.configurationUnchanged&&b.upstreamSourceVerified);
 assert.equal(b.excessiveDepthReproduction,false);assert.equal(b.fixtureSha256,fixtureHash);assert.equal(input.fixtureSha256,fixtureHash);
 assert.deepEqual(b.changedFiles,['/app/vendor/symfony/expression-language/Parser.php']);
 for(const [name,hash]of [['baseline',s.files[0].beforeSha256],['native',s.files[0].afterSha256]]){
  const p=b[name];assert(p.passed&&p.normalChecks===18&&p.network==='none');
  assert.equal(p.excessiveDepthReproduction,false);assert.equal(p.parserSha256,hash);
 }
 assert(b.native.hasDepthGuard);
 return true;
}
export function proveExpressionRelease(input,s,b,v,a,g,fixtureHash,appFixtureHashes){
 proveExpressionSource(input,s,b,fixtureHash);assert.equal(s.approval,'approved');
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

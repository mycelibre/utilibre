import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {proveExpressionSource,proveExpressionRelease} from './expression-policy.mjs';
const input=JSON.parse(fs.readFileSync(new URL('./symfony-inputs.json',import.meta.url)));
function fixture(key){
 const i=structuredClone(input),s=i.rows.find(s=>s.key===key);s.approval='approved';
 const imageId='sha256:'+'b'.repeat(64),f=s.files[0];
 const normal=hash=>({passed:true,normalChecks:18,network:'none',excessiveDepthReproduction:false,parserSha256:hash,hasDepthGuard:true});
 const b={base:s.base,candidate:s.candidate,imageId,passed:true,configurationUnchanged:true,upstreamSourceVerified:true,excessiveDepthReproduction:false,fixtureSha256:i.fixtureSha256,changedFiles:[s.site+'/'+f.path],baseline:normal(f.beforeSha256),native:normal(f.afterSha256)};
 const v={passed:true,imageId,changedPaths:[...b.changedFiles]},g={passed:true,imageId,primarySourceFixVerified:true,newHighCritical:0,databaseSha256:'a'.repeat(64)};
 const a=key==='pollaris'?{passed:true,imageId,twoSessions:true,pollDeleted:true,workerStarted:true,externalBrowserRequests:0,network:'No external interface; shared loopback namespace'}:{passed:true,imageId,network:'none',proofs:[s.base,imageId].map(imageId=>({imageId,passed:true,checks:26,accounts:2}))};
 return {i,s,b,v,a,g,hash:i.fixtureSha256,appHashes:structuredClone(i.applicationFixtures[key])};
}
const prove=x=>proveExpressionRelease(x.i,x.s,x.b,x.v,x.a,x.g,x.hash,x.appHashes);
for(const key of ['wallabag','pollaris']){
 test(key+': exact approved compatibility/source/application evidence passes without mutation',()=>{
  const x=fixture(key),before=JSON.stringify(x);assert(prove(x));assert(prove(x));assert.equal(JSON.stringify(x),before);
 });
 for(const [name,change]of Object.entries({
  unapproved:x=>x.s.approval='proposed',
  differentSource:x=>x.s.source.commit='f'.repeat(40),
  wrongSourceOrigin:x=>x.s.source.url='https://example.invalid/Parser.php',
  unexpectedFile:x=>x.b.changedFiles.push('/app/user-data'),
  changedConfig:x=>x.b.configurationUnchanged=false,
  missingNormalCheck:x=>x.b.native.normalChecks=17,
  missingDepthGuard:x=>x.b.native.hasDepthGuard=false,
  changedFixture:x=>x.hash='0'.repeat(64),
  alteredApplicationFixture:x=>x.appHashes={wrong:'0'.repeat(64)},
  incompleteInventory:x=>x.v.passed=false,
  newHighFinding:x=>x.g.newHighCritical=1,
  wrongCandidate:x=>x.a.imageId='sha256:'+'a'.repeat(64),
  externalRequests:x=>x.a.network='external',
 })){test(key+': rejects '+name,()=>{const x=fixture(key);change(x);assert.throws(()=>prove(x));});}
}
test('both branches require ordinary source checks independently of approval',()=>{
 const x=fixture('wallabag');x.s.approval='proposed';assert(proveExpressionSource(x.i,x.s,x.b,x.hash));
 x.b.baseline.parserSha256='0'.repeat(64);assert.throws(()=>proveExpressionSource(x.i,x.s,x.b,x.hash));
});
test('Wallabag requires independent baseline/candidate account workflows',()=>{const x=fixture('wallabag');x.a.proofs[0].imageId=x.b.imageId;assert.throws(()=>prove(x));});
test('Pollaris requires independent sessions, cleanup and worker',()=>{
 for(const key of ['twoSessions','pollDeleted','workerStarted']){const x=fixture('pollaris');x.a[key]=false;assert.throws(()=>prove(x));}
 const x=fixture('pollaris');x.a.externalBrowserRequests=1;assert.throws(()=>prove(x));
});

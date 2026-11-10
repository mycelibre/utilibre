import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {proveMongocSource, proveMongocRelease} from './mongoc-policy.mjs';
import {selectBatch} from '../security-20261103/batch.mjs';
const inputs=JSON.parse(fs.readFileSync(new URL('./mongoc-inputs.json',import.meta.url)));
function fixture(){
 const i=structuredClone(inputs),s=i.rows[0];s.approval='approved';
 const imageId='sha256:'+'a'.repeat(64);
 const b={base:s.base,candidate:s.candidate,imageId,passed:true,configurationUnchanged:true,packageMetadataPreserved:true,changedFiles:[i.library],librarySha256:'b'.repeat(64)};
 b.native={passed:true,abiPreserved:true,neededPreserved:true,compiler:i.compiler,sourceTreeSha256:i.sourceTreeSha256,cursorSha256:i.cursor.afterSha256,previousLibrarySha256:i.previousLibrarySha256,librarySha256:b.librarySha256,excessiveInputReproduction:false,byteReproducibilityClaimed:false,rows:['before','after'].map(state=>({state,passed:true,ordinaryConsumer:true,network:'none'}))};
 const v={passed:true,imageId,changedPaths:[i.library]},a={passed:true,imageId,fixtureSha256:i.fixtures.relaySha256,result:{passed:true,image:imageId}},g={passed:true,imageId,base:s.base,primarySourceFixVerified:true,newHighCritical:0,advisories:[i.advisory],databaseSha256:'c'.repeat(64)};
 return {i,s,b,v,a,g};
}
const prove=x=>proveMongocRelease(x.i,x.s,x.b,x.v,x.a,x.g);
test('exact approved repair is deterministic and leaves its inputs unchanged',()=>{const x=fixture(),before=JSON.stringify(x);assert(prove(x));assert(prove(x));assert.equal(JSON.stringify(x),before);});
for(const [name,change]of Object.entries({
 unapproved:x=>x.s.approval='proposed',
 unsupportedInput:x=>x.b.base='sha256:'+'0'.repeat(64),
 missingPrerequisite:x=>x.i.cursor.pins.shift(),
 reversedPatches:x=>x.i.cursor.pins.reverse(),
 differentSource:x=>x.b.native.sourceTreeSha256='0'.repeat(64),
 wrongPostimage:x=>x.b.native.cursorSha256='0'.repeat(64),
 compilerDrift:x=>x.b.native.compiler='sha256:'+'0'.repeat(64),
 abiChange:x=>x.b.native.abiPreserved=false,
 missingFeature:x=>x.b.native.neededPreserved=false,
 missingBaseline:x=>x.b.native.rows.shift(),
 unapprovedNetwork:x=>x.b.native.rows[1].network='default',
 failedConsumer:x=>x.b.native.rows[1].passed=false,
 extraChangedFile:x=>x.v.changedPaths.push('/etc/config'),
 changedConfiguration:x=>x.b.configurationUnchanged=false,
 missingRelay:x=>x.a.result.passed=false,
 differentRelayArtifact:x=>x.a.result.image=x.s.base,
 alteredFixture:x=>x.a.fixtureSha256='0'.repeat(64),
 scannerFailure:x=>x.g.passed=false,
 newHighFinding:x=>x.g.newHighCritical=1,
 noSourceProof:x=>x.g.primarySourceFixVerified=false,
 wrongAdvisory:x=>x.g.advisories=['unrelated'],
 missingDatabaseIdentity:x=>x.g.databaseSha256='',
})){test('rejects '+name,()=>{const x=fixture();change(x);assert.throws(()=>prove(x));});}
test('a source proof alone does not authorize release',()=>{const x=fixture();x.s.approval='proposed';assert(proveMongocSource(x.i,x.s,x.b));assert.throws(()=>prove(x));});
test('finite selector accepts only declared November profile',()=>{assert.equal(selectBatch(['--batch-20261109','--mongoc','coturn']).root,'/var/lib/utilibre-maintenance/security-20261109');assert.throws(()=>selectBatch(['--batch-20261109','--mongoc','--oauth']));assert.throws(()=>selectBatch(['--batch-20261109','--mongoc','--unknown']));});

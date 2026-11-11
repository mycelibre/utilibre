import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkerIdentity} from '../releases-20261111/recorded-checkers.mjs';
const sha=p=>createHash('sha256').update(fs.readFileSync(new URL(p,import.meta.url))).digest('hex');
const profiles={
 'static-nginx':['check-musl-static.py',9],
 'nginx-runtime':['check-musl-nginx.py',9],
 'node-runtime':['check-musl-runtimes.py',11],
 'php-runtime':['check-musl-runtimes.py',8],
 'postgres-runtime':['check-musl-runtimes.py',6],
 'redis-runtime':['check-musl-runtimes.py',6],
};
export function proveMusl(inputs,s,b,c,scan){
 assert.equal(s.approval,'approved','Review is required before activation');
 const proxyCounts={'community-ntfy':9,'opengist-opengist':6,'rimgo-rimgo':4,'reader-evaluation-gothub':3,'reader-evaluation-safetwitch-backend':2,'reader-evaluation-anonymousoverflow':1};
 const special={'pack-galene-galene':[3,['../go-final/check-galene.mjs','../../pack/check-galene-lifecycle.mjs']],'additions-fmd':[7,['../go-runtime-20261011/check-fmd.mjs']],'kittygram-kittygram':[9,[]],'binternet-onion-tor':[5,['../../community/binternet-torrc']]};
 const specialRule=s.consumerProfile==='special-native'?special[s.evidenceKey||s.key]:null;
 const profile=specialRule?['check-musl-special.py',specialRule[0]]:['proxy-native','native-app'].includes(s.consumerProfile)&&proxyCounts[s.evidenceKey||s.key]?['check-musl-proxy.py',proxyCounts[s.evidenceKey||s.key]]:profiles[s.consumerProfile];assert(profile,'Unreviewed consumer profile');
 const fixture=inputs.nativeFixture;
 assert.equal(b.fixtureSha256,fixture.retainedBinarySha256);
 assert.equal(sha(fixture.source),fixture.sourceSha256);
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 assert(c.passed&&c.imageId===b.imageId&&c.base===b.base&&c.abiPreserved&&c.baselineExportedSymbols>1000);
 assert.equal(c.fixtureSha256,profile[0]==='check-musl-nginx.py'?checkerIdentity('deployment/maintenance/security-20261109/'+profile[0],c.fixtureSha256,b.imageId):sha(profile[0]));
 assert.deepEqual(c.rows.map(r=>r.imageId),[b.base,b.imageId]);
 assert(c.rows.every(r=>r.passed&&r.checks===profile[1]));
 if(s.consumerProfile.endsWith('nginx')||s.consumerProfile==='nginx-runtime')
  assert(c.rows[0].rootSha256&&c.rows[0].rootSha256===c.rows[1].rootSha256);
 else {
  assert.equal(c.profile,s.consumerProfile);
  assert.equal(c.rows[0].runtime,c.rows[1].runtime);
  if(s.consumerProfile==='postgres-runtime')assert(c.rows.every(r=>r.nativeDumpRestore));
 }
 if(['proxy-native','native-app'].includes(s.consumerProfile)){const fixture=s.consumerProfile==='proxy-native'?'go-final/check-native.mjs':(s.evidenceKey||s.key)==='community-ntfy'?'go-leaf-final/check-ntfy.py':'go-leaf-final/check-opengist.py';assert.equal(c.applicationFixture,fixture);assert.equal(c.applicationFixtureSha256,sha('../'+fixture));assert.deepEqual(c.rows[0].responses,c.rows[1].responses);}
 if(specialRule){assert.deepEqual(c.supportingFixtureHashes,Object.fromEntries(specialRule[1].map(p=>[p,sha(p)])));assert.deepEqual(c.rows.map(({imageId,...rest})=>rest)[0],c.rows.map(({imageId,...rest})=>rest)[1]);}
 assert.deepEqual(c.nativeRows,b.nativeRows);
 assert(b.nativeRows.length===2&&b.nativeRows.every(r=>r.passed&&r.checks===16));
 assert(scan.passed&&scan.targetedFindingRemoved&&scan.newHighCritical===0);
 assert.equal(scan.imageId,b.imageId);assert.equal(scan.base,b.base);
}

import {zodApplicationProof} from '../security-20261028/zod-application-proof.mjs';
import assert from 'node:assert/strict';
export function proveJsNov(s,b,n,a){
 assert(b.passed&&b.configurationUnchanged&&b.unchangedOtherAppFiles>0);assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);
 assert(n.passed&&n.imageId===b.imageId&&n.base===s.base&&n.network==='none');
 const paths=Object.entries(s.paths);assert.equal(n.rows.length,paths.reduce((sum,[,p])=>sum+p.length*2,0));
 for(const [name,entries]of paths)for(const path of entries){const before=n.rows.find(r=>r.imageId===s.base&&r.path===path),after=n.rows.find(r=>r.imageId===b.imageId&&r.path===path);assert(before?.passed&&after?.passed);assert.equal(before.version,s.before[path]);
  if(name==='seroval'){assert.equal(after.version,'1.6.11');assert(before.constructorInjected&&!after.constructorInjected);assert.equal(after.normalChecks,9);assert(after.arrayShapeRejected.length===2&&after.arrayShapeRejected.every(Boolean));if(before.version==='1.6.7')assert(before.arrayShapeRejected.every(x=>!x));}
  else if(name==='re2js'){assert.equal(after.version,'2.8.7');assert(!before.linearRepeatedMatching&&after.linearRepeatedMatching&&after.normalChecks===8);assert(after.counts.length===2&&after.counts.every(r=>r.steps<4*r.length));}
  else if(name==='decode-uri-component'){assert.equal(after.version,'0.5.1');assert(!before.linearReplacementWork&&after.linearReplacementWork&&after.normalChecks===10);assert(after.replaceInputCharacters<=4*after.inputBytes);}
  else{assert.equal(name,'joi');assert.equal(after.version,'17.13.9');assert(!before.boundedWhitespace&&after.boundedWhitespace);assert.equal(after.normalChecks,8);}
 }
 assert(a.passed&&a.imageId===b.imageId);
 if(s.key==='admin'){assert(a.existingTanstackFixPreserved&&a.forgedResponsesRejected&&a.legitimateServerFunction&&a.nativeMigrationAndRouteParity);assert.equal(a.rows.length,2);assert.deepEqual(a.rows.map(r=>r.image),[b.base,b.imageId]);for(const r of a.rows){assert(r.observations.length===2&&r.observations.every(o=>!o.markerPresent&&o.status===401));assert(r.normal.status===200&&r.normal.hasExpectedData&&r.wrongMethod===405);}}
 else if(s.key==='resume'){zodApplicationProof('resume',b.imageId,a,b.base);assert(a.nativeStartup&&a.applicationParity.length===2);assert.deepEqual(a.applicationParity.map(r=>r.imageId),[b.base,b.imageId]);for(const r of a.applicationParity)assert(r.result==='passed'&&r.cleanup.length===3);}
 else if(s.key==='grist-decode'){assert(a.base===s.base&&a.rows.length===2);assert.deepEqual(a.rows.map(r=>r.imageId),[b.base,b.imageId]);for(const r of a.rows){assert(r.passed&&r.productionChanged===false&&r.network==='none'&&r.data==='fictional only');assert(r.checks.length===3&&r.checks.every(c=>c.passed));}assert(n.rows.every(r=>r.cjsFunction&&r.consumerChecks===6));assert(b.packages.length===1&&b.packages[0].compatibility?.decoderSha256==='6a86ac891edf15c5efa0841ebb31935e3669d58b98318b57d7b08a4530317cb0');}
 else if(s.key==='rsshub'){assert(a.base===s.base&&a.rows.length===2);assert.deepEqual(a.rows.map(r=>r.imageId),[b.base,b.imageId]);for(const r of a.rows)assert(r.passed&&r.nativeStartup&&r.network==='none'&&r.productionChanged===false);}
 else{assert.equal(s.key,'gathio');assert(a.base===s.base&&a.rows.length===2);assert.deepEqual(a.rows.map(r=>r.imageId),[b.base,b.imageId]);for(const r of a.rows)assert(r.passed&&r.nativeGathioCreateEdit&&r.invalidEditTokenDenied&&r.imageUpload&&r.icsImportExport&&r.stoppedDatabaseCopyRestore&&r.reopenedOriginalAndImportedEvents&&r.productionChanged===false);}
 return true;
}

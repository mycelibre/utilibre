import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),root='/var/lib/utilibre-maintenance/security-20261109',read=p=>JSON.parse(fs.readFileSync(p));
export function proveXnet(s){
 assert.equal(s.approval,'approved');const d=root+'/xnet/'+s.key,b=read(d+'/combined/candidate.json'),i=read(new URL('./xnet-inputs.json',import.meta.url)),original=i.rows.find(r=>r.key===s.key);
 assert(b.passed&&b.zlibOverlayProven&&b.configurationUnchanged&&b.sourceUnchanged&&b.nativeResponseParity&&b.newHighCritical===0);assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(b.imageId,s.imageId);assert.equal(sha(d+'/'+s.key),b.binarySha256);assert.equal(sha(d+'/source-proof.json'),original.sourceProofSha256);
 assert.equal(b.scanDatabaseSha256,s.databaseSha256);if(b.newFindings.length){assert.equal(s.key,'anonymousoverflow');assert.deepEqual(b.newFindings,[['GO-2026-5932','golang.org/x/crypto','v0.58.0','UNKNOWN']]);assert(b.removedFindings.some(r=>r[0]==='GO-2026-5932'&&r[1]==='golang.org/x/crypto'&&r[2]==='v0.57.0'));assert.equal(sha(d+'/openpgp-review.json'),s.retainedAdvisoryReviewSha256);const review=read(d+'/openpgp-review.json');assert(review.passed&&review.imageId===b.imageId&&!review.affectedPackagePresent);assert.equal(sha(d+'/native-dependencies.txt'),review.dependenciesSha256);}else assert.deepEqual(b.newFindings,[]);assert.deepEqual(b.changedFiles,[original.binary]);assert(b.unchangedFiles>700);
 assert.deepEqual(b.locks,original.locks);for(const [f,h]of Object.entries(original.locks))assert.equal(sha(new URL('./xnet-locks/'+s.key+'/'+f,import.meta.url)),h);
 assert(b.moduleChanges.some(r=>r.module==='golang.org/x/net'&&r.after.startsWith('v0.62.0 ')));assert(b.moduleChanges.every(r=>['golang.org/x/net','golang.org/x/crypto','golang.org/x/sys','golang.org/x/text','golang.org/x/sync','golang.org/x/tools','golang.org/x/term'].includes(r.module)));
 for(const file of ['before-scan.json','after-scan.json'])assert.equal(sha(d+'/combined/'+file),s.evidenceSha256[file]);
 assert.equal(read(d+'/combined/after-scan.json').Metadata.ImageID,b.imageId);
 const z=root+'/zlib/'+s.zlibKey,zb=read(z+'/build.json'),scope=read(z+'/scope.json');assert(zb.passed&&scope.passed&&zb.base===s.base&&zb.imageId===b.compositionBase);assert(scope.allUnrelatedImageFilesUnchanged&&scope.zlibAbiPreserved&&scope.muslUnchanged);assert.equal(sha(z+'/scope.json'),zb.scopeSha256);
 for(const phase of ['before','after']){const f=root+'/xnet/regression/regression-'+phase+'.json';assert.equal(sha(f),s.evidenceSha256['regression-'+phase]);const r=read(f);assert(r.passed&&r.benignTextPreserved);}
 const source=read(root+'/xnet/published-source.json').rows.find(r=>r.key===s.key);assert(source&&source.imageId===b.imageId);assert.equal(sha('/opt/utilibre/toolbox-public/'+source.archive),source.sha256);
 assert.equal(sha(new URL('./xnet-check.py',import.meta.url)),s.checkSha256);
 assert(Date.now()-Date.parse(b.date)<86400000);assert(Date.now()-Date.parse(s.advisoryUpdatedAt)<48*3600000);
 return {s,b,scan:{passed:true,base:s.base,imageId:b.imageId,remainingHigh:b.retainedCounts.HIGH||0,remainingCritical:b.retainedCounts.CRITICAL||0}};
}

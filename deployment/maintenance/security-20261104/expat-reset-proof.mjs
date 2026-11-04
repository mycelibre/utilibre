import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
export const resetAdvisory='CVE-2026-113351';
export const proofPath='/var/lib/utilibre-maintenance/security-20261104/expat-reset.json';
export const shaFile=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
export function validateResetProof(proof,librarySha256){
 assert.equal(proof.status,'passed');assert.equal(proof.advisory,resetAdvisory);
 assert.equal(proof.sourceSha256,shaFile(new URL('./expat-reset.c',import.meta.url)));
 assert.equal(proof.network,'none');assert.equal(proof.productionMounts,false);
 assert.equal(proof.fixtureBytes,65536);
 const old=proof.rows.filter(r=>r.state==='before');
 assert.equal(old.length,2);assert.deepEqual(old.map(r=>r.library).sort(),['libexpat','libexpatw']);
 assert(old.every(r=>r.result.version==='expat_2.9.0'&&r.result.afterReset===0&&r.result.error===1&&r.result.initialSmall&&r.result.large&&r.result.reset));
 const row=proof.rows.find(r=>r.state==='after'&&r.librarySha256===librarySha256);
 assert(row,'Exact candidate library has no reset regression');
 assert.equal(row.result.version,'expat_2.10.0');assert.equal(row.result.afterReset,1);assert.equal(row.result.error,0);
 assert(row.result.initialSmall&&row.result.large&&row.result.reset);
 return {path:proofPath,sourceSha256:proof.sourceSha256,librarySha256};
}

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {proveXnet} from './xnet-policy.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('./xnet-release-inputs.json',import.meta.url))).rows;
for(const row of rows){
 test(row.key+' exact combined candidate accepted',()=>{assert.equal(proveXnet(structuredClone(row)).b.imageId,row.imageId);});
 for(const [name,mutate]of Object.entries({'unapproved':s=>s.approval='pending','wrong artifact':s=>s.imageId='sha256:'+'0'.repeat(64),'wrong baseline':s=>s.base='sha256:'+'0'.repeat(64),'changed scanner evidence':s=>s.evidenceSha256['after-scan.json']='bad','changed regression':s=>s.evidenceSha256['regression-before']='bad','changed verifier':s=>s.checkSha256='bad'}))test(row.key+' rejects '+name,()=>{const s=structuredClone(row);mutate(s);assert.throws(()=>proveXnet(s));});
}

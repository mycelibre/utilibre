import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {proveXnet} from './xnet-policy.mjs';
const rows=JSON.parse(fs.readFileSync(new URL('./xnet-release-inputs.json',import.meta.url))).rows.filter(s=>s.mode!=='binary-followup');
for(const row of rows){
 test(row.key+' exact retained combined candidate accepted for read-only verification',()=>{assert.equal(proveXnet(structuredClone(row),{requireRecentCandidate:false}).b.imageId,row.imageId);});
 test(row.key+' archived review cannot waive default activation freshness',()=>{
  const realNow=Date.now;Date.now=()=>realNow()+7*86400000;
  try{assert.throws(()=>proveXnet(structuredClone(row)));assert.equal(proveXnet(structuredClone(row),{requireRecentCandidate:false}).b.imageId,row.imageId);}
  finally{Date.now=realNow;}
 });
 for(const [name,mutate]of Object.entries({'unapproved':s=>s.approval='pending','wrong artifact':s=>s.imageId='sha256:'+'0'.repeat(64),'wrong baseline':s=>s.base='sha256:'+'0'.repeat(64),'changed scanner evidence':s=>s.evidenceSha256['after-scan.json']='bad','changed regression':s=>s.evidenceSha256['regression-before']='bad','changed verifier':s=>s.checkSha256='bad'}))test(row.key+' rejects '+name,()=>{const s=structuredClone(row);mutate(s);assert.throws(()=>proveXnet(s));});
}

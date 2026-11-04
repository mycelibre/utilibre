import test from 'node:test';import assert from 'node:assert/strict';
import {validateResetProof,resetAdvisory,shaFile} from './expat-reset-proof.mjs';
const result=(version,afterReset,error)=>({version,afterReset,error,initialSmall:true,large:true,reset:true});
function proof(){return {status:'passed',advisory:resetAdvisory,sourceSha256:shaFile(new URL('./expat-reset.c',import.meta.url)),network:'none',productionMounts:false,fixtureBytes:65536,rows:[...['libexpat','libexpatw'].map(library=>({state:'before',library,result:result('expat_2.9.0',0,1)})),{state:'after',library:'libexpat',librarySha256:'known-library',result:result('expat_2.10.0',1,0)}]};}
test('accept only exact candidate with both affected controls and legitimate parsing',()=>assert.equal(validateResetProof(proof(),'known-library').librarySha256,'known-library'));
test('reject unknown deployed bytes',()=>assert.throws(()=>validateResetProof(proof(),'unknown-library')));
test('reject an unrelated baseline failure',()=>{const p=proof();p.rows[0].result.error=2;assert.throws(()=>validateResetProof(p,'known-library'));});
test('reject failing candidate or missing successful input',()=>{for(const key of ['afterReset','initialSmall','large','reset']){const p=proof();p.rows[2].result[key]=0;assert.throws(()=>validateResetProof(p,'known-library'));}});
test('reject missing wide baseline, changed fixture or network',()=>{for(const mutate of [p=>p.rows.shift(),p=>p.sourceSha256='changed',p=>p.network='host',p=>p.productionMounts=true]){const p=proof();mutate(p);assert.throws(()=>validateResetProof(p,'known-library'));}});

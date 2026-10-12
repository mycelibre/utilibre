import test from 'node:test';import assert from 'node:assert/strict';
import {eligible} from './review-policy.mjs';import {denoSourceName} from './collect.mjs';
const sourceHash='a'.repeat(64);
const sample={status:'needs-review',scope:'upstream-release-source-lock',type:'cargo',targetName:denoSourceName,artifact:`${denoSourceName}@sha256:${sourceHash}`,installed:'0.25.2',severity:'HIGH',id:'GHSA-3v94-mw7p-v465',package:'hickory-proto'};
test('DNS permission evidence is confined to two exact source findings',()=>{
 assert(eligible(sample,sourceHash));assert(!eligible(sample));assert(!eligible(sample,'b'.repeat(64)));assert(eligible({...sample,id:'GHSA-5j98-2g5x-46v6',package:'hickory-resolver'},sourceHash));
 for(const change of [{scope:'runtime-image'},{targetName:'other'},{artifact:'other'},{installed:'0.25.3'},{severity:'MEDIUM'},{id:'other'},{package:'hickory-resolver'},{type:'npm'}])assert(!eligible({...sample,...change},sourceHash));
});

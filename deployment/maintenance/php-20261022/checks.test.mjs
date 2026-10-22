import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyInputs,verifyPackageDelta,sha256} from './checks.mjs';
const spec={base:'sha256:'+'a'.repeat(64),manager:'apk',origin:'php85',version:'8.5.12-r0'};
const bytes=Buffer.from('synthetic package fixture, not a native package');
const name='php85-8.5.12-r0.apk';
const lock={...spec,packageHashes:{[name]:sha256(bytes)}};
test('identical recorded payload verifies repeatedly',()=>{for(let i=0;i<2;i++)verifyInputs(spec,lock,{[name]:bytes});});
test('unsupported image or version is rejected',()=>{
 assert.throws(()=>verifyInputs({...spec,base:'sha256:'+'b'.repeat(64)},lock,{[name]:bytes}));
 assert.throws(()=>verifyInputs({...spec,version:'8.5.11-r0'},lock,{[name]:bytes}));
});
test('changed, missing and extra package bytes are rejected',()=>{
 assert.throws(()=>verifyInputs(spec,lock,{[name]:Buffer.from('changed')}));
 assert.throws(()=>verifyInputs(spec,lock,{}));
 assert.throws(()=>verifyInputs(spec,lock,{[name]:bytes,'extra.apk':bytes}));
});
test('path escape and malformed hashes are rejected',()=>{
 assert.throws(()=>verifyInputs(spec,{...lock,packageHashes:{'../escape.apk':sha256(bytes)}},{'../escape.apk':bytes}));
 assert.throws(()=>verifyInputs(spec,{...lock,packageHashes:{[name]:'bad'}},{[name]:bytes}));
});
const before={php85:{origin:'php85',version:'8.5.11-r0'},'php85-fpm':{origin:'php85',version:'8.5.11-r0'},unrelated:{origin:'other',version:'1'}};
const selected=['php85','php85-fpm'];
const after={...before,...Object.fromEntries(selected.map(n=>[n,{...before[n],version:spec.version}]))};
test('only the complete PHP source-package family may change',()=>verifyPackageDelta(spec,before,after,selected));
test('missing PHP module, unrelated upgrade, removal or addition is rejected',()=>{
 assert.throws(()=>verifyPackageDelta(spec,before,after,['php85']));
 assert.throws(()=>verifyPackageDelta(spec,before,{...after,unrelated:{origin:'other',version:'2'}},selected));
 const removed={...after};delete removed.unrelated;assert.throws(()=>verifyPackageDelta(spec,before,removed,selected));
 assert.throws(()=>verifyPackageDelta(spec,before,{...after,new:{origin:'other',version:'1'}},selected));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {backport,changes} from './backport.mjs';
test('Reject unknown input without fuzzy edits',()=>{
 for(const value of ['', 'unreviewed source', changes.map(x=>x[1]).join(';')])assert.throws(()=>backport(value),/Unsupported compiled input/);
});
test('Patch sites and output are distinct and bounded',()=>{
 assert.equal(changes.length,10);
 assert.equal(new Set(changes.map(x=>x[1])).size,10);
 for(const [name,before,after] of changes){assert(name);assert(before.length>20);assert.notEqual(before,after);}
});

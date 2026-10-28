import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyApplicationTime} from './release-inputs.mjs';
test('completed evidence is assessed at its approval; new releases remain fresh',()=>{
 const approved=Date.now()-10*86400000,checked=new Date(approved-3600000).toISOString();
 verifyApplicationTime(checked,approved);
 assert.throws(()=>verifyApplicationTime(checked));
 verifyApplicationTime(new Date(Date.now()-1000).toISOString());
});
test('reject future, malformed, reversed and stale release evidence',()=>{
 const now=Date.now();
 for(const [checked,approved] of [['invalid',now],[new Date(now-1).toISOString(),'invalid'],[new Date(now-1000).toISOString(),now+10000],[new Date(now+10000).toISOString(),now],[new Date(now-86400000).toISOString(),now]])assert.throws(()=>verifyApplicationTime(checked,approved));
});

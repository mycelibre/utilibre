import test from 'node:test';import assert from 'node:assert/strict';
import {redlibOld as old,redlibNew as next,replaceRedlibDefaultPin as compose,replaceRedlibEnvPin as env} from './ubuntu-pins.mjs';
const text='services:\n  redlib:\n    image: ${REDLIB_IMAGE:-'+old+'} # reviewed\n  other:\n    image: unrelated:1\n';
test('Exact default and same-ref override round-trip without touching other fields',()=>{
 const output=compose(text,old,next);assert.equal(output.replaced,1);assert.equal(compose(output.text,next,old).text,text);
 const source='UNRELATED=fictional\nREDLIB_IMAGE='+old+'\n';const updated=env(source,old,next);assert.equal(env(updated.text,next,old).text,source);assert(updated.text.startsWith('UNRELATED=fictional\n'));
});
test('Reject other variables, nested expressions, duplicate pins and actual different overrides',()=>{
 for(const bad of [text.replace('REDLIB_IMAGE','OTHER_IMAGE'),text.replace(old,'${OTHER_IMAGE:-'+old+'}'),text+text,text.replace(old,next),text.replace('${REDLIB_IMAGE:-'+old+'}',old)])assert.throws(()=>compose(bad,old,next));
 for(const bad of ['REDLIB_IMAGE=unknown\n','REDLIB_IMAGE="'+old+'"\n','REDLIB_IMAGE='+old+'\nREDLIB_IMAGE='+old+'\n','export REDLIB_IMAGE='+old+'\n'])assert.throws(()=>env(bad,old,next));
 assert.throws(()=>compose(text,old,'unreviewed:latest'));
});

import test from 'node:test';import assert from 'node:assert/strict';import {verifyCodecDelta} from './codec-policy.mjs';
const sum='h1:v5tiZvm1KGLyg5d5oXdXe3lsSPrbEUiKoXGia//I7Qo=',old=['dep\tgithub.com/klauspost/compress\tv1.18.5\th1:old','dep\texample.org/retained\tv2.0.0\th1:unchanged'],next=['dep\tgithub.com/klauspost/compress\tv1.20.2\t'+sum,old[1]];
test('one reviewed codec dependency changes; ordering is irrelevant',()=>verifyCodecDelta([...old].reverse(),next,'v1.18.5',sum));
test('wrong baseline and changed integrity fail closed',()=>{assert.throws(()=>verifyCodecDelta(old,next,'v1.18.0',sum));assert.throws(()=>verifyCodecDelta(old,[next[0]+'x',next[1]],'v1.18.5',sum));});
test('unrelated changes, removals, replacement directives and duplicates rejected',()=>{for(const n of [[next[0]],[...next,'=>\texample.org/other\tv1.0.0\th1:x'],[next[0],next[1]+'changed'],[...next,next[0]]])assert.throws(()=>verifyCodecDelta(old,n,'v1.18.5',sum));});

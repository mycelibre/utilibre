import {test} from 'node:test';import assert from 'node:assert/strict';import {verifyTextDelta} from './text-policy.mjs';
const old=['dep\tgolang.org/x/text\tv0.40.0\th1:old','dep\tother\tv1.0.0\th1:retained'],next=['dep\tgolang.org/x/text\tv0.41.0\th1:vz/seA0lnX87Othu2f/0L24RcgrXD9/YFTSuGjj3rH8=',old[1]];
test('finite x/text delta and genuinely unlinked control accepted',()=>{assert.equal(verifyTextDelta(old,next),1);assert.equal(verifyTextDelta([old[1]],[old[1]]),0)});
test('wrong baseline, integrity, missing package and unrelated changes rejected',()=>{for(const [a,b]of [[old.map(x=>x.replace('v0.40.0','v0.39.0')),next],[old,next.map(x=>x.replace('vz/se','false'))],[old,[next[1]]],[old,[...next,'=>\tother\tfork']],[old,[...next,next[0]]]])assert.throws(()=>verifyTextDelta(a,b))});

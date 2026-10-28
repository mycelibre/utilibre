import assert from 'node:assert/strict';
export function verifyCodecDelta(before,after,previous,sum){
 assert(['v1.18.5','v1.18.0'].includes(previous));assert(/^h1:[A-Za-z0-9+/]{43}=$/.test(sum));
 const prefix='dep\tgithub.com/klauspost/compress\t',old=before.filter(l=>l.startsWith(prefix)),next=after.filter(l=>l.startsWith(prefix));
 assert.equal(old.length,1);assert.equal(next.length,1);assert.equal(new Set(before).size,before.length);assert.equal(new Set(after).size,after.length);
 assert.deepEqual(after.filter(l=>!l.startsWith(prefix)).sort(),before.filter(l=>!l.startsWith(prefix)).sort(),'Unrelated dependency change');
 assert.equal(old[0].split('\t')[2],previous);assert.equal(next[0],prefix+'v1.20.2\t'+sum);
}

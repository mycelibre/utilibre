import assert from 'node:assert/strict';
export function verifyTextDelta(before,after){
 const prefix='dep\tgolang.org/x/text\t',old=before.filter(l=>l.startsWith(prefix)),next=after.filter(l=>l.startsWith(prefix));
 assert.equal(new Set(before).size,before.length);assert.equal(new Set(after).size,after.length);
 assert.deepEqual(after.filter(l=>!l.startsWith(prefix)).sort(),before.filter(l=>!l.startsWith(prefix)).sort(),'Unrelated module changed');
 if(!old.length&&!next.length)return 0;
 assert.equal(old.length,1);assert.equal(next.length,1);assert.equal(old[0].split('\t')[2],'v0.40.0');
 assert.equal(next[0],prefix+'v0.41.0\th1:vz/seA0lnX87Othu2f/0L24RcgrXD9/YFTSuGjj3rH8=');return 1;
}

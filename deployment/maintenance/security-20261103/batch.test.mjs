import test from 'node:test';import assert from 'node:assert/strict';import {selectBatch} from './batch.mjs';
test('batch selection preserves old releases and restricts the new profile',()=>{
 assert.equal(selectBatch(['--expat']).enabled,false);
 const b=selectBatch(['--expat','--batch-20261103','prepare','fixture']);assert(b.enabled);assert(b.root.endsWith('20261103'));assert.deepEqual(b.args,['--expat','prepare','fixture']);
 assert.throws(()=>selectBatch(['--batch-20261103','--node']));assert.throws(()=>selectBatch(['--expat','--batch-20261103','--batch-20261103']));
 assert(selectBatch(['--sqlite','--batch-20261103']).enabled);
});

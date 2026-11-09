import test from 'node:test';import assert from 'node:assert/strict';import {selectBatch} from './batch.mjs';
test('batch selection preserves old releases and restricts the new profile',()=>{
 assert.equal(selectBatch(['--expat']).enabled,false);
 const b=selectBatch(['--expat','--batch-20261103','prepare','fixture']);assert(b.enabled);assert(b.root.endsWith('20261103'));assert.deepEqual(b.args,['--expat','prepare','fixture']);
 assert.throws(()=>selectBatch(['--batch-20261103','--node']));assert.throws(()=>selectBatch(['--expat','--batch-20261103','--batch-20261103']));
 assert(selectBatch(['--sqlite','--batch-20261103']).enabled);
});
test('9 November batch permits only the reviewed musl profile',()=>{
 const b=selectBatch(['--batch-20261109','--musl','fixture']);
 assert.equal(b.root,'/var/lib/utilibre-maintenance/security-20261109');
 assert.deepEqual(b.args,['--musl','fixture']);assert(b.input('musl').pathname.endsWith('/security-20261109/musl-inputs.json'));
 assert.throws(()=>b.input('expat'));
 assert.throws(()=>selectBatch(['--batch-20261109','--musl','--expat']));
 assert.throws(()=>selectBatch(['--batch-20261109','--musl','--batch-20261103']));
 assert.throws(()=>selectBatch(['--batch-20261109','--musl','--batch-20261109']));
});
test('library follow-ups select exactly one finite November profile',()=>{
 for(const profile of ['zlib','xnet']){
  const b=selectBatch(['--batch-20261109','--'+profile,'prepare','fixture']);
  assert.equal(b.root,'/var/lib/utilibre-maintenance/security-20261109');
  assert(b.input(profile).pathname.endsWith('/'+(profile==='xnet'?'xnet-release':profile)+'-inputs.json'));
 }
 assert.throws(()=>selectBatch(['--batch-20261109','--zlib','--xnet']));
 assert.throws(()=>selectBatch(['--batch-20261109','--zlib','--arbitrary']));
});

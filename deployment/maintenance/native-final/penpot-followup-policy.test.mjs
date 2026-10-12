import test from 'node:test';
import assert from 'node:assert/strict';
import {followupInputModule} from './penpot-followup-policy.mjs';
test('separate reviewed repair variants retain separate evidence adapters',()=>{
  assert.equal(followupInputModule(undefined),null);
  assert.match(followupInputModule('--rsvg-tiff').pathname,/\/penpot-native-followup\/release-inputs\.mjs$/);
  assert.match(followupInputModule('--heif-alignment').pathname,/\/penpot-heif-alignment\/release-inputs\.mjs$/);
});
test('unreviewed flags and import paths cannot select release input code',()=>{
  for(const flag of ['',null,'__proto__','constructor','../other.mjs','https://example.org/inputs.mjs','--force'])
    assert.throws(()=>followupInputModule(flag),/Unknown Penpot repair variant/);
});

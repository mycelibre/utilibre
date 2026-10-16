import test from 'node:test';
import assert from 'node:assert/strict';
import {overlayHost} from './refresh-host-review.mjs';
const before={status:'checked',completedAt:'2026-10-15T10:00:00Z',database:{updatedAt:'2026-10-15T07:00:00Z'},images:[{id:'unchanged'}],sources:[{name:'unchanged'}]};
const host={status:'checked',packages:500,os:{inventory:'present'},scannedAt:'2026-10-16T09:00:00Z',database:{updatedAt:before.database.updatedAt}};
test('host refresh preserves old fleet freshness and unrelated exact observations',()=>{
 const after=overlayHost(before,host);assert.equal(after.completedAt,before.completedAt);assert.equal(after.images,before.images);assert.equal(after.sources,before.sources);assert.equal(after.host,host);assert.equal(before.host,undefined);
});
test('reject failed, empty, stale and differently sourced observations',()=>{
 for(const change of [{status:'failed'},{packages:0},{os:{inventory:'missing'}},{scannedAt:'invalid'},{scannedAt:'2026-10-14T09:00:00Z'},{database:{updatedAt:'new'}}])assert.throws(()=>overlayHost(before,{...host,...change}));
 assert.throws(()=>overlayHost({...before,status:'incomplete'},host));
});

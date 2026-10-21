import test from 'node:test';
import assert from 'node:assert/strict';
import {expectedRestarts} from '../language-final/release.mjs';
test('historical restarts are allowed only on the exact recorded predecessor container',()=>{
 const row={oldContainerId:'predecessor',oldRestartCount:2};
 assert.equal(expectedRestarts(row,'predecessor','old'),2);
 assert.equal(expectedRestarts(row,'predecessor','new'),0);
 assert.equal(expectedRestarts(row,'rollback-container','old'),0);
 assert.equal(expectedRestarts({},'legacy-container','old'),0);
});

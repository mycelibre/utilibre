import test from 'node:test';
import assert from 'node:assert/strict';
import {overlapSpecs,validateExportedHeader,verifyOverlap} from './headers-overlap.mjs';
const safe='/* SPDX-License-Identifier: GPL-2.0 WITH Linux-syscall-note */\n'+'/* harmless exported constant */\n'.repeat(4);
test('exported header content gate rejects private members and absent provenance',()=>{
 assert.match(validateExportedHeader(safe,['driver_override']),/^[a-f0-9]{64}$/);
 assert.throws(()=>validateExportedHeader(safe+'\nconst char *driver_override;',['driver_override']));
 assert.throws(()=>validateExportedHeader(safe.replace('Linux-syscall-note','other'),['driver_override']));
 assert.throws(()=>validateExportedHeader(safe,['.*']));
});
test('only six individually reviewed immutable upstream patches qualify',()=>{
 assert.equal(Object.keys(overlapSpecs).length,6);
 for(const id of Object.keys(overlapSpecs))assert.throws(()=>verifyOverlap(id,[],[],'unverified patch',()=>safe));
 assert.throws(()=>verifyOverlap('CVE-2026-99999',[],[],'',()=>safe));
});

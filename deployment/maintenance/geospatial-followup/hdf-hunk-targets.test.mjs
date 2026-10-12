import test from 'node:test';
import assert from 'node:assert/strict';
import {anchorHdfHunks} from './hdf-hunk-targets.mjs';
const patch='diff --git a/a b/a\n--- a/a\n+++ b/a\n@@ -3,3 +3,3 @@ SWinqfields(int id)\n before\n-while (1)\n+while (ptr)\n after\n';
const source='Other()\n{\nbefore\nwhile (1)\nafter\n}\nSWinqfields(int id)\n{\nbefore\nwhile (1)\nafter\n}\n';
test('Identical earlier context cannot take the named-function repair',()=>assert.match(anchorHdfHunks(patch,source),/@@ -9,3 \+9,3 @@ SWinqfields/));
test('Missing function fails closed',()=>{assert.throws(()=>anchorHdfHunks(patch,source.replace('SWinqfields','OtherFunction')));});
test('Ambiguous function definition fails closed',()=>{assert.throws(()=>anchorHdfHunks(patch,source+source));});
test('Different hunk context fails closed',()=>{assert.throws(()=>anchorHdfHunks(patch,source.replaceAll('before','different')));});

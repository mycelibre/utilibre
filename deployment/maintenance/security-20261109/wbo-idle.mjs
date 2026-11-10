import assert from 'node:assert/strict';
// Only aggregate state; never inspect or retain board names or contents.
export function requireEmptyWhiteboard(store, connections) {
  assert.deepEqual(Object.keys(store).sort(), ['bytes','files']);
  assert.equal(store.files, 0, 'Temporary boards prevent this restart');
  assert.equal(store.bytes, 0, 'Temporary board bytes prevent this restart');
  assert.equal(connections, 0, 'An active whiteboard connection prevents this restart');
  return {files:0, bytes:0, connections:0};
}

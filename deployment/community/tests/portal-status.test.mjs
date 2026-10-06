import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const compose = readFileSync(new URL('compose.yaml', root), 'utf8');
const inventory = JSON.parse(readFileSync(new URL('deployment/community/delivery-checklist.json', root), 'utf8'));
const statusBlock = compose.match(/      STATUS_SERVICES: >-\n([\s\S]+?)\n    volumes:/)?.[1];

test('every launched web service has a private portal liveness target', () => {
  assert.ok(statusBlock, 'Keep the status target list explicitly reviewable');
  const entries = statusBlock.split(',').map(entry => entry.trim());
  const ids = entries.map(entry => entry.split('=')[0]);
  assert.equal(ids.length, new Set(ids).size, 'No duplicate status targets');
  // Native Mumble is deliberately not misrepresented as an HTTP/UDP voice check.
  const webIds = inventory.lastVerifiedPublicServices.filter(id => id !== 'mumble');
  assert.deepEqual(ids.toSorted(), webIds.toSorted());
  for (const entry of entries) {
    assert.match(entry, /^[a-z0-9-]+=http:\/\/(?:\$\{PRIVATE_BIND_IP\}|searxng|redlib):[^\s]+$/);
  }
});

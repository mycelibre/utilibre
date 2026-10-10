import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const compose = readFileSync(new URL('compose.yaml', root), 'utf8');
const inventory = JSON.parse(readFileSync(new URL('deployment/community/delivery-checklist.json', root), 'utf8'));
const statusBlock = compose.match(/      STATUS_SERVICES: >-\n([\s\S]+?)\n    volumes:/)?.[1];

test('every enabled service has its intended portal readiness target', () => {
  assert.ok(statusBlock, 'Keep the status target list explicitly reviewable');
  const entries = statusBlock.split(',').map(entry => entry.trim());
  const ids = entries.map(entry => entry.split('=')[0]);
  assert.equal(ids.length, new Set(ids).size, 'No duplicate status targets');
  assert.deepEqual(ids.toSorted(), inventory.lastVerifiedPublicServices.toSorted());
  for (const entry of entries) {
    assert.match(entry, /^[a-z0-9-]+=(?:http:\/\/(?:\$\{PRIVATE_BIND_IP\}|searxng|redlib):[^\s]+|https:\/\/[a-z0-9-]+\.utilibre\.org\/[^\s]*)$/);
  }
  // This observation reads Kuma's private TCP monitor, not UDP voice readiness.
  assert.equal(entries.find(entry => entry.startsWith('mumble=')),
    'mumble=http://${PRIVATE_BIND_IP}:3125/api/status-page/heartbeat/utilibre');
});

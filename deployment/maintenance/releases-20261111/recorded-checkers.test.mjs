import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {checkerIdentity} from './recorded-checkers.mjs';
const m = JSON.parse(fs.readFileSync(new URL('./recorded-checkers.json', import.meta.url)));
for (const row of m.rows) {
  test(row.path + ': completed artifacts retain their exact checker identity', () => {
    for (const a of row.artifacts) assert.equal(checkerIdentity(row.path, row.sha256, a.imageId), row.sha256);
  });
  test(row.path + ': unknown artifacts cannot use historical evidence', () => assert.throws(() => checkerIdentity(row.path, row.sha256, 'sha256:' + '0'.repeat(64))));
  test(row.path + ': altered recorded hash is rejected', () => assert.throws(() => checkerIdentity(row.path, '0'.repeat(64), row.artifacts[0].imageId)));
  test(row.path + ': new builds still bind to the current source', () => {
    const h = createHash('sha256').update(fs.readFileSync(new URL('../../../' + row.path, import.meta.url))).digest('hex');
    assert.equal(checkerIdentity(row.path, h, 'new-candidate-needs-separate-release-approval'), h);
  });
}
test('unreviewed paths are rejected', () => assert.throws(() => checkerIdentity('package.json', '', '')));

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectSnapshot, parseManifest, sources } from './backup-native.mjs';

const text = 'Fictional database archive for a selector test.\n';
const hash = createHash('sha256').update(text).digest('hex');
test('native manifest formats preserve names and reject traversal/duplicates/invalid digests', () => {
  assert.deepEqual(parseManifest('SHA256SUMS', `${hash}  postgres/app.dump\n`), [['postgres/app.dump', hash]]);
  assert.deepEqual(parseManifest('SHA256.json', JSON.stringify({ 'private/app.env': hash })), [['private/app.env', hash]]);
  assert.deepEqual(parseManifest('manifest.json', JSON.stringify({ sha256: hash })), [['trip-state.tar.gz', hash]]);
  for (const name of ['../secret', '/secret', 'a/../secret', 'a//secret', 'a\nsecret', 'a\\secret']) {
    assert.throws(() => parseManifest('SHA256.json', JSON.stringify({ [name]: hash })));
  }
  assert.throws(() => parseManifest('SHA256SUMS', `${hash}  a\n${hash}  a\n`));
  assert.throws(() => parseManifest('SHA256.json', '{}'));
  assert.throws(() => parseManifest('SHA256.json', JSON.stringify({ a: 'wrong' })));
});
test('completed selection checks checksums, freshness, completion markers and symlinks', async t => {
  const root = await mkdtemp(join(tmpdir(), 'utilibre-backup-selector-'));
  t.after(() => rm(root, { recursive: true, force: true })); // Only this test's mkdtemp directory.
  const dir = join(root, '20261010T120000Z');
  await mkdir(dir);
  await writeFile(join(dir, 'app.dump'), text);
  await writeFile(join(dir, 'SHA256SUMS'), `${hash}  app.dump\n`);
  const spec = { root, id: 'fixture', pattern: /^\d{8}T\d{6}Z$/, marker: 'SHA256SUMS' };
  assert.equal((await inspectSnapshot(spec)).files.length, 2);
  await assert.rejects(inspectSnapshot({ ...spec, complete: true }), /No completed/);
  await writeFile(join(dir, 'COMPLETE'), 'completed');
  assert.equal((await inspectSnapshot({ ...spec, complete: true })).files.length, 3);
  await writeFile(join(dir, 'app.dump'), 'corrupted');
  await assert.rejects(inspectSnapshot(spec), /checksum mismatch/);
  await rm(join(dir, 'app.dump'));
  await writeFile(join(root, 'outside'), text);
  await symlink(join(root, 'outside'), join(dir, 'app.dump'));
  await assert.rejects(inspectSnapshot(spec), /Non-regular/);
  await rm(join(dir, 'app.dump'));
  await writeFile(join(dir, 'app.dump'), text);
  const old = new Date(Date.now() - 37 * 3600_000);
  await utimes(join(dir, 'SHA256SUMS'), old, old);
  await assert.rejects(inspectSnapshot(spec), /stale/);
});
test('pooled directories retain distinct application selections', () => {
  const community = sources.filter(item => item.root.endsWith('/community-backups'));
  assert.deepEqual(community.map(item => item.id).sort(), ['bytestash', 'community', 'linkding', 'opengist', 'vikunja']);
  for (const item of community) {
    assert.equal(item.pattern.test('kuma-before-monitor-update-1234'), false);
    assert.equal(item.pattern.test('.incomplete'), false);
  }
  assert.equal(new Set(sources.map(item => item.id)).size, sources.length);
});

test('temporary-content generations cannot be copied off-host again', async t => {
  const root = await mkdtemp(join(tmpdir(), 'utilibre-ephemeral-backup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = join(root, 'snapshot');
  await mkdir(join(dir, 'files'), { recursive: true });
  await mkdir(join(dir, 'private'));
  const spec = { root, pattern: /^snapshot$/, marker: 'SHA256.json' };
  for (const [id, forbidden, allowed] of [
    ['core', 'files/privatebin-data.tar.gz', 'files/configuration.tar.gz'],
    ['family-chess', 'chess.sqlite3', 'private/app.env'],
  ]) {
    await writeFile(join(dir, forbidden), text);
    await writeFile(join(dir, 'SHA256.json'), JSON.stringify({ [forbidden]: hash }));
    await assert.rejects(inspectSnapshot({ ...spec, id }), /excluded temporary content/);
    await writeFile(join(dir, allowed), text);
    await writeFile(join(dir, 'SHA256.json'), JSON.stringify({ [allowed]: hash }));
    const selected = await inspectSnapshot({ ...spec, id });
    assert.deepEqual(selected.files, [join(dir, 'SHA256.json'), join(dir, allowed)]);
  }
});

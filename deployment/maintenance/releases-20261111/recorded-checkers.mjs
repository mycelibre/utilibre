// Historical source identity, not release approval or current security clearance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root = new URL('../../../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('./recorded-checkers.json', import.meta.url)));
const hash = value => createHash('sha256').update(value).digest('hex');

export function checkerIdentity(path, expected, imageId) {
  assert.equal(manifest.schemaVersion, 1);
  const row = manifest.rows.find(r => r.path === path);
  assert(row, 'Unreviewed checker path');
  const current = hash(fs.readFileSync(new URL(path, root)));
  if (current === expected) return current;
  assert.equal(expected, row.sha256, 'Unreviewed historical checker');
  assert(row.artifacts.some(a => a.imageId === imageId), 'Unknown historical artifact');
  assert.equal(row.revision, '271686f0161c26f51c8cd35bd09c2dc90eaa33be');
  const archived = execFileSync('git', ['show', row.revision + ':' + path], {cwd: root, timeout: 10000, maxBuffer: 128 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  assert.equal(hash(archived), expected, 'Recorded Git object no longer matches');
  return expected;
}

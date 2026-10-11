import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, readdir, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('core archive keeps configuration/account work but not temporary paste data', async t => {
  const root = await mkdtemp(join(tmpdir(), 'utilibre-backup-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['bin', 'scripts', 'config/privatebin', 'system', 'systemd', 'edge', 'docs', 'secrets', 'data/privatebin', 'temporary/privatebin', 'data/freshrss', 'data/backups']) {
    await mkdir(join(root, dir), { recursive: true });
  }
  for (const file of ['compose.yaml', '.env', '.env.example', 'README.md', 'SOURCE_MANIFEST.md']) await writeFile(join(root, file), '');
  await writeFile(join(root, 'config/privatebin/conf.php'), 'FICTIONAL_CONFIGURATION');
  await writeFile(join(root, 'data/privatebin/paste'), 'TEMPORARY_CONTENT_MUST_NOT_COPY');
  await writeFile(join(root, 'temporary/privatebin/paste'), 'TEMPORARY_CONTENT_MUST_NOT_COPY');
  await writeFile(join(root, 'data/freshrss/account'), 'FICTIONAL_DURABLE_ACCOUNT');
  await writeFile(join(root, 'bin/docker'), '#!/bin/sh\nprintf "FICTIONAL_DATABASE_DUMP\\n"\n', { mode: 0o700 });
  await copyFile(new URL('../scripts/backup.sh', import.meta.url), join(root, 'scripts/backup.sh'));
  for (let n = 1; n <= 9; n++) await mkdir(join(root, `data/backups/daily-2020010${n}-000000`));
  const snapshot = execFileSync('sh', [join(root, 'scripts/backup.sh'), '--no-prune'], {
    env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` }, encoding: 'utf8',
  }).trim();
  assert.deepEqual((await readdir(join(snapshot, 'files'))).sort(), ['configuration.tar.gz', 'freshrss-data.tar.gz']);
  execFileSync('sha256sum', ['-c', 'SHA256SUMS'], { cwd: snapshot, stdio: 'ignore' });
  const config = execFileSync('tar', ['-tzf', join(snapshot, 'files/configuration.tar.gz')], { encoding: 'utf8' });
  assert(config.includes('config/privatebin/conf.php'));
  assert(!config.split('\n').some(name => /^(data|temporary)\//.test(name)));
  const account = execFileSync('tar', ['-xOzf', join(snapshot, 'files/freshrss-data.tar.gz'), 'freshrss/account'], { encoding: 'utf8' });
  assert.equal(account, 'FICTIONAL_DURABLE_ACCOUNT');
  assert.equal((await readdir(join(root, 'data/backups'))).filter(name => name.startsWith('daily-')).length, 10);
  assert.equal(await readFile(join(root, 'data/privatebin/paste'), 'utf8'), 'TEMPORARY_CONTENT_MUST_NOT_COPY');
  assert.equal(await readFile(join(root, 'temporary/privatebin/paste'), 'utf8'), 'TEMPORARY_CONTENT_MUST_NOT_COPY');
});

test('legacy PrivateBin restore fails before reading or changing data', () => {
  assert.throws(() => execFileSync('sh', [new URL('../scripts/restore.sh', import.meta.url).pathname, '/nonexistent-fixture', 'privatebin', '--rehearsal'], { stdio: 'pipe' }), error => {
    assert.equal(error.status, 2);
    assert.match(error.stderr.toString(), /never resurrect expired pastes/);
    return true;
  });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, copyFile, readdir, rm, readFile, chmod, symlink } from 'node:fs/promises';
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
  await copyFile(new URL('../scripts/check-backup-input.py', import.meta.url), join(root, 'scripts/check-backup-input.py'));
  for (let n = 1; n <= 9; n++) await mkdir(join(root, `data/backups/daily-2020010${n}-000000`));
  const snapshot = execFileSync('sh', [join(root, 'scripts/backup.sh'), '--no-prune'], {
    env: { ...process.env, TAR_OPTIONS: '--exclude=freshrss', PATH: `${join(root, 'bin')}:${process.env.PATH}` }, encoding: 'utf8',
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
  await chmod(join(root, 'data/backups'), 0o777);
  assert.throws(() => execFileSync('sh', [join(root, 'scripts/backup.sh'), '--no-prune'], { stdio: 'pipe' }), error => /writable by another/.test(error.stderr.toString()));
  assert.equal((await readdir(join(root, 'data/backups'))).filter(name => name.startsWith('daily-')).length, 10);
});

test('ordinary file restore is private and ignores inherited archive filters', async t => {
  const root = await mkdtemp(join(tmpdir(), 'utilibre-restore-policy-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'bin', 'snapshot/files', 'fixture/freshrss']) await mkdir(join(root, dir), { recursive: true });
  for (const file of ['restore.sh', 'check-backup-input.py']) await copyFile(new URL(`../scripts/${file}`, import.meta.url), join(root, 'scripts', file));
  await writeFile(join(root, 'fixture/freshrss/account'), 'FICTIONAL_SAVED_WORK');
  execFileSync('/usr/bin/tar', ['-C', join(root, 'fixture'), '-czf', join(root, 'snapshot/files/freshrss-data.tar.gz'), 'freshrss']);
  const sum = execFileSync('sha256sum', ['files/freshrss-data.tar.gz'], { cwd: join(root, 'snapshot'), encoding: 'utf8' });
  await writeFile(join(root, 'snapshot/SHA256SUMS'), sum);
  await writeFile(join(root, 'bin/tar'), '#!/bin/sh\numask > "$POLICY_TEST_MASK"\nexec /usr/bin/tar "$@"\n', { mode: 0o700 });
  const env = { ...process.env, TAR_OPTIONS: '--exclude=freshrss', PATH: `${join(root, 'bin')}:${process.env.PATH}`, POLICY_TEST_MASK: join(root, 'mask') };
  const output = execFileSync('sh', [join(root, 'scripts/restore.sh'), 'snapshot', 'freshrss-files', '--rehearsal'], { cwd: root, env, encoding: 'utf8' });
  assert.match(output, /Restore rehearsal succeeded/);
  assert.equal((await readFile(join(root, 'mask'), 'utf8')).trim(), '0077');
  assert.equal(await readFile(join(root, 'fixture/freshrss/account'), 'utf8'), 'FICTIONAL_SAVED_WORK');
  await chmod(join(root, 'snapshot/files/freshrss-data.tar.gz'), 0o666);
  assert.throws(() => execFileSync('sh', [join(root, 'scripts/restore.sh'), join(root, 'snapshot'), 'freshrss-files', '--rehearsal'], { env, stdio: 'pipe' }), error => /writable by another/.test(error.stderr.toString()));
  await chmod(join(root, 'snapshot/files/freshrss-data.tar.gz'), 0o600);
  await symlink(join(root, 'snapshot'), join(root, 'linked-snapshot'));
  assert.throws(() => execFileSync('sh', [join(root, 'scripts/restore.sh'), join(root, 'linked-snapshot'), 'freshrss-files', '--rehearsal'], { env, stdio: 'pipe' }), error => /regular files\/directories only/.test(error.stderr.toString()));
  assert.equal(await readFile(join(root, 'snapshot/SHA256SUMS'), 'utf8'), sum);
  assert.throws(() => execFileSync('python3', [join(root, 'scripts/check-backup-input.py'), 'snapshot', root + '/fixture/../snapshot'], { stdio: 'pipe' }), error => /without parent traversal/.test(error.stderr.toString()));
});

test('legacy PrivateBin restore fails before reading or changing data', () => {
  assert.throws(() => execFileSync('sh', [new URL('../scripts/restore.sh', import.meta.url).pathname, '/nonexistent-fixture', 'privatebin', '--rehearsal'], { stdio: 'pipe' }), error => {
    assert.equal(error.status, 2);
    assert.match(error.stderr.toString(), /never resurrect expired pastes/);
    return true;
  });
});

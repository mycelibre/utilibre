// Linux/root integration test. A small disposable filesystem, never live data.
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, chmod, chown, writeFile, readFile, rm, statfs } from 'node:fs/promises';

const run = (...args) => execFileSync(args[0], args.slice(1), {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});

test('ext4 resize preserves files; project quotas isolate and aggregate native writes', async () => {
  assert.equal(process.getuid(), 0, 'Requires root, e2fsprogs, util-linux and quota');
  const dir = await mkdtemp('/opt/utilibre/temporary-quota-test-');
  const image = `${dir}/fixture.ext4`, mount = `${dir}/mount`;
  let device, mounted = false;
  try {
    await mkdir(mount); await chmod(dir, 0o755);
    run('truncate', '-s', '64M', image);
    // Only the newly created regular fixture file is formatted.
    run('mkfs.ext4', '-q', '-F', image);
    device = run('losetup', '--find', '--show', image).trim();
    assert.match(device, /^\/dev\/loop\d+$/);
    run('mount', '-o', 'nodev,nosuid,noexec', device, mount); mounted = true;
    await writeFile(`${mount}/fictional.txt`, 'Fictional resize fixture.\n');
    run('umount', mount); mounted = false;
    run('truncate', '-s', '96M', image);
    run('losetup', '--set-capacity', device);
    run('e2fsck', '-f', '-p', device);
    run('resize2fs', device);
    run('tune2fs', '-O', 'project', '-Q', 'prjquota', device);
    run('e2fsck', '-f', '-p', device);
    run('mount', '-o', 'nodev,nosuid,noexec,prjquota', device, mount); mounted = true;
    assert.equal(await readFile(`${mount}/fictional.txt`, 'utf8'), 'Fictional resize fixture.\n');
    for (const [name, project] of [['privatebin', 14401], ['chess', 14402], ['cache', 14402]]) {
      const path = `${mount}/${name}`;
      await mkdir(path); await chown(path, 65534, 65534);
      run('chattr', '-p', String(project), '+P', path);
    }
    run('setquota', '-P', '14401', '0', '1024', '0', '0', mount);
    run('setquota', '-P', '14402', '0', '2048', '0', '0', mount);
    const privateSize = await statfs(`${mount}/privatebin`), sharedSize = await statfs(`${mount}/chess`);
    assert.equal(privateSize.blocks * privateSize.bsize, 1024 ** 2);
    assert.equal(sharedSize.blocks * sharedSize.bsize, 2 * 1024 ** 2);
    const allocate = (name, bytes) => run('setpriv', '--reuid=65534', '--regid=65534',
      '--clear-groups', 'fallocate', '-l', String(bytes), `${mount}/${name}/synthetic.bin`);
    allocate('chess', 1200 * 1024);
    assert.throws(() => allocate('cache', 1200 * 1024), e => /quota exceeded/i.test(String(e.stderr)));
    allocate('privatebin', 512 * 1024);
    assert.throws(() => allocate('privatebin', 2 * 1024 ** 2), e => /quota exceeded/i.test(String(e.stderr)));
    const before = await statfs(`${mount}/privatebin`);
    assert(before.bavail * before.bsize < 1024 ** 2);
    await mkdir(`${mount}/privatebin/child`);
    assert.match(run('lsattr', '-p', '-d', `${mount}/privatebin/child`), /14401.*P/);
    // Persistent mount options and on-disk quotas survive a normal remount.
    run('umount', mount); mounted = false;
    run('mount', '-o', 'nodev,nosuid,noexec,prjquota', device, mount); mounted = true;
    assert.equal((await statfs(`${mount}/privatebin`)).blocks, before.blocks);
    assert.throws(() => allocate('cache', 1200 * 1024), e => /quota exceeded/i.test(String(e.stderr)));
  } finally {
    if (mounted) run('umount', mount);
    if (device) run('losetup', '-d', device);
    await rm(dir, { recursive: true });
  }
});

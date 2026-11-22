// Exact official Git LFS Debian 13 package. Local signed-index verification,
// synthetic no-network functionality test, one host package, no service restart.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';

process.umask(0o077);
const mode = process.argv[2];
assert(['check', 'apply', 'verify'].includes(mode) && process.argv.length === 3);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = '/var/lib/utilibre-maintenance/security-20261122/git-lfs';
const old = root + '/git-lfs_3.6.1-1+deb13u1_amd64.deb';
const next = root + '/git-lfs_3.8.1_amd64.deb';
const oldVersion = '3.6.1-1+deb13u1', nextVersion = '3.8.1';
const hashes = {
  old: 'fcb3e7a6c042e70fc541d05b163c88fffd3364d509c961e83dec881e7cda5bca',
  next: '4ecf7eb1cbd648e17ec629290aa78d6b8b8892116371098bda2068e919af246f',
  tar: 'e72cf723a4a660438862282e8aecf3885fc8123e88bfcad534cf6b941a354b75',
  releaseIndex: 'dfb77c2e4b64413924085d07d4bfdadcf4bf9c4301c47482bb55ab643cc4f08a',
  packages: 'd5bde0fa140bc21eb9a95e69f5503607fd05cd6d6925d18a64bd925891786086',
  key: 'cae1519c7874bbfce6aada3cc29ffd444ce3e1ad14d8c56d2f6d98d2753d2cd6',
  binary: 'a1b8e1ed096e100858b64f2e3352f3c7d405a335cd51165ecc57aff6c80407ab',
  postinst: '74aa3990541be5bfdc8c79b2a11b50dcdbf2741fa32415aa19e30c8f7e4064ad',
  prerm: 'a3e1980c90519dfad0bc87e32862bab13830111fabfe93ed90a355b3392c4aa1',
};
const builder = 'sha256:3796b1a3dcd4c750db7ebddee955bd0ee8244051e24beaf8fbf5a4ddf06d1d9d';
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (p, value) => {fs.writeFileSync(p + '.tmp', JSON.stringify(value, null, 2) + '\n', {mode: 0o600}); fs.renameSync(p + '.tmp', p);};
function run(command, args, timeout = 30000) {
  const result = cp.spawnSync(command, args, {encoding: 'utf8', timeout, maxBuffer: 2 * 1024 ** 2,
    env: {PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C', DEBIAN_FRONTEND: 'noninteractive'},
    stdio: ['ignore', 'pipe', 'pipe']});
  if (result.status !== 0) throw Error(path.basename(command) + ' failed: ' + String(result.error || result.stderr).slice(0, 400));
  return result.stdout.trim();
}
const version = () => run('dpkg-query', ['-W', '-f=${Version}', 'git-lfs']);
const inventory = () => run('dpkg-query', ['-W', '-f=${binary:Package}=${Version}\n']).split('\n').filter(x => !/^git-lfs(?::[a-z0-9-]+)?=/.test(x)).sort();
const pids = () => run('systemctl', ['show', 'docker.service', 'ssh.service', '-p', 'Id', '-p', 'MainPID']);
function configEntries() {
  const entries = run('git', ['config', '--system', '--list']).split('\n').sort();
  assert.deepEqual(entries, [
    'filter.lfs.clean=git-lfs clean -- %f',
    'filter.lfs.process=git-lfs filter-process',
    'filter.lfs.required=true',
    'filter.lfs.smudge=git-lfs smudge -- %f',
  ].sort(), 'Unexpected system Git configuration');
  return entries;
}
function noConsumer() {
  const host = fs.statSync('/');
  for (const id of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) try {
    const other = fs.statSync('/proc/' + id + '/root');
    if (other.dev !== host.dev || other.ino !== host.ino) continue;
    assert.notEqual(fs.readlinkSync('/proc/' + id + '/exe').replace(/ \(deleted\)$/, ''), '/usr/bin/git-lfs', 'Host Git LFS process active');
  } catch (error) {if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error;}
}
function signedIndex() {
  for (const [name, file] of [['old', old], ['next', next], ['tar', root + '/git-lfs-linux-amd64-v3.8.1.tar.gz'],
    ['releaseIndex', root + '/InRelease'], ['packages', root + '/Packages.gz'], ['key', root + '/gpgkey.asc']])
    assert.equal(sha(file), hashes[name], name);
  assert.equal(run('docker', ['image', 'inspect', '--format', '{{.Id}}', builder]), builder);
  const proof = run('docker', ['run', '--rm', '--network', 'none', '--read-only', '--user', '0:0',
    '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--tmpfs', '/tmp:rw,nosuid,size=16m',
    '-v', root + ':/e:ro', '--entrypoint', '/bin/sh', builder, '-ec',
    'export GNUPGHOME=/tmp/gnupg; mkdir -m 700 "$GNUPGHOME"; gpg --batch --yes --dearmor -o /tmp/key.gpg /e/gpgkey.asc; gpgv --status-fd 1 --keyring /tmp/key.gpg /e/InRelease']);
  assert(proof.includes('[GNUPG:] VALIDSIG 32C73D4819E2F9B2745335546B05F25D762E3157 '));
  const release = fs.readFileSync(root + '/InRelease', 'utf8');
  assert(release.includes('Origin: packagecloud.io/github/git-lfs\n'));
  assert(release.includes('Codename: trixie\n'));
  assert(release.includes(' ' + hashes.packages + ' 2030 main/binary-amd64/Packages.gz\n'));
  const packages = zlib.gunzipSync(fs.readFileSync(root + '/Packages.gz')).toString('utf8');
  const stanzas = packages.split(/\n\n/).filter(s => /^Package: git-lfs$/m.test(s) && /^Version: 3\.8\.1$/m.test(s) && /^Architecture: amd64$/m.test(s));
  assert.equal(stanzas.length, 1);
  assert(stanzas[0].includes('SHA256: ' + hashes.next + '\n'));
  assert(stanzas[0].includes('Filename: pool/trixie/main/g/git-lfs/git-lfs_3.8.1_amd64.deb\n'));
  assert(stanzas[0].includes('Size: ' + fs.statSync(next).size + '\n'));
}
function packageScope(temporary) {
  assert.equal(run('dpkg-deb', ['-f', old, 'Package']), 'git-lfs');
  assert.equal(run('dpkg-deb', ['-f', old, 'Version']), oldVersion);
  assert.equal(run('dpkg-deb', ['-f', next, 'Package']), 'git-lfs');
  assert.equal(run('dpkg-deb', ['-f', next, 'Version']), nextVersion);
  assert.equal(run('dpkg-deb', ['-f', next, 'Architecture']), 'amd64');
  assert.equal(run('dpkg-deb', ['-f', next, 'Depends']), 'libc6 (>= 2.34), git (>= 2.0.0)');
  run('dpkg-deb', ['-x', next, temporary]);
  run('dpkg-deb', ['-e', next, temporary + '-control']);
  assert.deepEqual(fs.readdirSync(temporary + '-control').sort(), ['control', 'md5sums', 'postinst', 'prerm']);
  assert.equal(sha(temporary + '-control/postinst'), hashes.postinst);
  assert.equal(sha(temporary + '-control/prerm'), hashes.prerm);
  const files = [];
  function visit(dir) {for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name), stat = fs.lstatSync(file);
    if (stat.isDirectory()) visit(file);
    else {assert(stat.isFile() && !stat.isSymbolicLink()); files.push(file.slice(temporary.length));}
  }}
  visit(temporary);
  assert(files.includes('/usr/bin/git-lfs') && files.length > 30);
  for (const file of files) assert(file === '/usr/bin/git-lfs' || /^\/usr\/share\/(doc\/git-lfs\/|man\/|lintian\/overrides\/git-lfs$)/.test(file), 'Unexpected package path: ' + file);
  assert.equal(sha(temporary + '/usr/bin/git-lfs'), hashes.binary);
  assert.match(run(temporary + '/usr/bin/git-lfs', ['version']), /^git-lfs\/3\.8\.1 /);
  return files.sort().map(file => ({path: file, sha256: sha(temporary + file)}));
}
function exactFiles(files) {for (const file of files) assert.equal(sha(file.path), file.sha256, file.path);}
function test(binary, expected) {
  assert.equal(run('bash', [here + '/test-git-lfs-offline.sh', binary, expected]),
    `passed git-lfs/${expected} local pointer, checkout and fsck`);
}
const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
const temporary = fs.mkdtempSync('/tmp/utilibre-git-lfs-release-');
fs.chmodSync(temporary, 0o755);
try {
  assert(fs.statfsSync('/').bavail * fs.statfsSync('/').bsize >= 8 * 1024 ** 3, 'Recovery disk floor');
  assert.equal(run('dpkg', ['--audit']), '');
  signedIndex();
  const files = packageScope(temporary + '/new');
  const common = {oldVersion, nextVersion, hashes, builder, files,
    recipeSha256: sha(fileURLToPath(import.meta.url)), testSha256: sha(here + '/test-git-lfs-offline.sh')};
  const receipt = root + '/release.json', checked = root + '/check.json';
  if (mode === 'verify') {
    const r = read(receipt); assert.equal(r.status, 'passed');
    for (const [key, value] of Object.entries(common)) assert.deepEqual(r[key], value, key);
    assert.equal(version(), nextVersion); assert.equal(run('dpkg', ['-V', 'git-lfs']), '');
    exactFiles(files); test('/usr/bin/git-lfs', nextVersion);
    assert.equal(digest(JSON.stringify(configEntries())), r.gitConfigEntriesSha256);
    noConsumer();
    console.log(JSON.stringify({status: 'passed', version: nextVersion, noServiceRestart: true}));
  } else {
    assert(!fs.existsSync(receipt), 'Release exists; use verify');
    assert.equal(version(), oldVersion); assert.equal(run('dpkg', ['-V', 'git-lfs']), '');
    noConsumer(); test('/usr/bin/git-lfs', '3.6.1'); test(temporary + '/new/usr/bin/git-lfs', nextVersion);
    const simulation = run('apt-get', ['--simulate', '--no-download', 'install', next]);
    assert.deepEqual(simulation.split('\n').filter(x => x.startsWith('Inst ')).map(x => x.split(' ')[1]), ['git-lfs']);
    assert(!/^Remv /m.test(simulation));
    const preflight = {...common, otherInventorySha256: digest(JSON.stringify(inventory())),
      gitConfigEntriesSha256: digest(JSON.stringify(configEntries())), servicePids: pids(), checkedAt: new Date().toISOString()};
    if (mode === 'check') {
      save(checked, preflight);
      console.log('Host Git LFS preflight passed; one package only, no service change.');
    } else {
      const proof = read(checked);
      assert(Date.now() - Date.parse(proof.checkedAt) < 15 * 60000);
      for (const [key, value] of Object.entries(preflight)) if (key !== 'checkedAt') assert.deepEqual(proof[key], value, key);
      const r = {...preflight, status: 'installing', startedAt: new Date().toISOString()};
      try {
        run('dpkg', ['--install', next]);
        assert.equal(version(), nextVersion); assert.equal(run('dpkg', ['-V', 'git-lfs']), '');
        exactFiles(files); test('/usr/bin/git-lfs', nextVersion); noConsumer();
        assert.equal(digest(JSON.stringify(inventory())), r.otherInventorySha256);
        assert.equal(digest(JSON.stringify(configEntries())), r.gitConfigEntriesSha256);
        assert.equal(pids(), r.servicePids);
        run('python3', [path.resolve(here, '../../../scripts/maintenance-update-policy.py'), '--write-unattended-blacklist']);
        assert(fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages', 'utf8').includes('^git[-]lfs'));
        r.status = 'passed'; r.completedAt = new Date().toISOString(); r.noServiceRestart = true;
        save(receipt, r);
        console.log(JSON.stringify({status: 'passed', version: nextVersion, noServiceRestart: true}));
      } catch (error) {
        r.status = 'failed'; r.error = String(error.message).slice(0, 300);
        const failedAt = Date.now();
        fs.copyFileSync('/etc/gitconfig', root + '/gitconfig-at-failure-' + failedAt);
        fs.chmodSync(root + '/gitconfig-at-failure-' + failedAt, 0o600);
        r.gitConfigAtFailureSha256 = sha(root + '/gitconfig-at-failure-' + failedAt);
        try {
          run('dpkg', ['--install', old]);
          assert.equal(version(), oldVersion); assert.equal(run('dpkg', ['-V', 'git-lfs']), '');
          test('/usr/bin/git-lfs', '3.6.1');
          assert.equal(digest(JSON.stringify(configEntries())), r.gitConfigEntriesSha256);
          r.rollback = 'verified';
        } catch {r.rollback = 'unverified';}
        save(root + '/release-failed-' + failedAt + '.json', r);
        throw Error('Git LFS release failed; inspect private receipt');
      }
    }
  }
} finally {
  assert(path.dirname(temporary) === '/tmp' && path.basename(temporary).startsWith('utilibre-git-lfs-release-'));
  fs.rmSync(temporary, {recursive: true}); unlock();
}

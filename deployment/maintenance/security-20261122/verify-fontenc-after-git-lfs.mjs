// Read-only continuity proof for the one reviewed host package installed after
// libfontenc. The original immutable release receipt remains unchanged.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

process.umask(0o077);
assert.equal(process.argv.length, 2);
const here = fileURLToPath(new URL('.', import.meta.url));
const base = '/var/lib/utilibre-maintenance/security-20261122/';
const font = JSON.parse(fs.readFileSync(base + 'fontenc/host-release/release.json'));
const lfs = JSON.parse(fs.readFileSync(base + 'git-lfs/release.json'));
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest = value => createHash('sha256').update(value).digest('hex');
function run(command, args) {
  const r = cp.spawnSync(command, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 ** 2,
    env: {PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C'}, stdio: ['ignore', 'pipe', 'pipe']});
  if (r.status !== 0) throw Error(command + ' failed: ' + String(r.error || r.stderr).slice(0, 250));
  return r.stdout.trim();
}
assert.equal(font.status, 'passed');
assert.equal(lfs.status, 'passed');
assert(Date.parse(font.completedAt) < Date.parse(lfs.completedAt));
assert(font.noServiceRestart && lfs.noServiceRestart);
assert.equal(font.servicePids, lfs.servicePids);
assert.equal(font.recipeSha256, sha(here + 'release-fontenc-host.mjs'));
assert.equal(lfs.recipeSha256, sha(here + 'release-git-lfs-host.mjs'));
assert.equal(run(process.execPath, [here + 'release-git-lfs-host.mjs', 'verify']),
  JSON.stringify({status: 'passed', version: '3.8.1', noServiceRestart: true}));
assert.equal(font.nextVersion, '1:1.1.8-1+deb13u0+utilibre1');
assert.equal(lfs.oldVersion, '3.6.1-1+deb13u1');
assert.equal(lfs.nextVersion, '3.8.1');
assert.equal(sha(base + 'fontenc/package-9a53935cc80bd9a2/libfontenc1_1.1.8-1+deb13u0+utilibre1_amd64.deb'), font.nextHash);
assert.equal(sha(base + 'fontenc/package-9a53935cc80bd9a2/package-build.json'), font.buildSha256);
assert.equal(run('dpkg-query', ['-W', '-f=${Version}', 'libfontenc1']), font.nextVersion);
assert.equal(run('dpkg', ['-V', 'libfontenc1']), '');
assert(font.exportsPreserved > 10 && font.newFiles.length > 4);
for (const file of font.newFiles) {
  const stat = fs.lstatSync(file.path);
  assert.equal(stat.mode & 0o7777, file.mode, file.path);
  if (file.link !== undefined) assert.equal(fs.readlinkSync(file.path), file.link, file.path);
  else assert.equal(sha(file.path), file.sha256, file.path);
}
const inventory = run('dpkg-query', ['-W', '-f=${binary:Package}=${Version}\n']).split('\n')
  .filter(x => !/^libfontenc1(?::[a-z0-9-]+)?=/.test(x)).sort();
assert.equal(inventory.filter(x => x === 'git-lfs=3.8.1').length, 1);
const predecessor = inventory.map(x => x === 'git-lfs=3.8.1' ? 'git-lfs=3.6.1-1+deb13u1' : x).sort();
assert.equal(digest(JSON.stringify(predecessor)), font.otherInventorySha256,
  'Unexpected host package change beyond the reviewed Git LFS release');
const code = 'import ctypes,os,sys;p=sys.argv[1];c=ctypes.CDLL(p);assert os.path.realpath(p) in open("/proc/self/maps").read();c.FontEncMapFind.argtypes=[ctypes.c_char_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_char_p];c.FontEncMapFind.restype=ctypes.c_void_p;c.FontEncRecode.argtypes=[ctypes.c_uint,ctypes.c_void_p];c.FontEncRecode.restype=ctypes.c_uint;m=c.FontEncMapFind(b"iso8859-1",1,0,0,None);assert m and c.FontEncRecode(65,m)==65 and c.FontEncRecode(241,m)==241;print("passed")';
assert.equal(run('runuser', ['-u', 'nobody', '--', 'python3', '-c', code, '/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0']), 'passed');
const host = fs.statSync('/');
for (const id of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) try {
  const other = fs.statSync('/proc/' + id + '/root');
  if (other.dev !== host.dev || other.ino !== host.ino) continue;
  assert(!fs.readFileSync('/proc/' + id + '/maps', 'utf8').includes('libfontenc.so'), 'Old host libfontenc mapping');
} catch (error) {if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error;}
const output = {status: 'passed', fontencVersion: font.nextVersion, gitLfsVersion: lfs.nextVersion,
  fontencReceiptSha256: sha(base + 'fontenc/host-release/release.json'),
  gitLfsReceiptSha256: sha(base + 'git-lfs/release.json'),
  successorOnly: 'git-lfs', exactInstalledFiles: font.newFiles.length, nativeCheck: true};
console.log(JSON.stringify(output));

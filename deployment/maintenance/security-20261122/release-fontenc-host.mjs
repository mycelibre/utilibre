// One native host libfontenc package only. No service restart or reboot.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {acquireReleaseLock} from '../security-20261103/release-lock.mjs';

process.umask(0o077);
const mode = process.argv[2];
assert(['check', 'apply', 'verify'].includes(mode) && process.argv.length === 3);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = '/var/lib/utilibre-maintenance/security-20261122/fontenc';
const output = root + '/host-release';
fs.mkdirSync(output, {recursive: true, mode: 0o700});
const old = root + '/builddeps/libfontenc1_1.1.8-1+b2_amd64.deb';
const next = root + '/package-9a53935cc80bd9a2/libfontenc1_1.1.8-1+deb13u0+utilibre1_amd64.deb';
const oldHash = '49f7330e1bbe3f48946fee5c07870df660374f9f77b378840d6edf1a3b3444cd';
const nextHash = 'f4d45124325a5269614ea1428ca030934f67c56eb3366c26786e6b8eb0c1a97e';
const oldVersion = '1:1.1.8-1+b2', nextVersion = '1:1.1.8-1+deb13u0+utilibre1';
const sha = p => createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const digest = v => createHash('sha256').update(v).digest('hex');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const save = (p, value) => {fs.writeFileSync(p + '.tmp', JSON.stringify(value, null, 2) + '\n', {mode: 0o600}); fs.renameSync(p + '.tmp', p);};
function run(program, args, options = {}) {
  const r = cp.spawnSync(program, args, {encoding: 'utf8', timeout: 30000, maxBuffer: 1024 ** 2,
    env: {PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C', DEBIAN_FRONTEND: 'noninteractive', ...options.env},
    stdio: ['ignore', 'pipe', 'pipe']});
  if (r.status !== 0) throw Error(path.basename(program) + ' failed: ' + String(r.error || r.stderr).slice(0, 400));
  return r.stdout.trim();
}
const version = () => run('dpkg-query', ['-W', '-f=${Version}', 'libfontenc1']);
const inventory = () => run('dpkg-query', ['-W', '-f=${binary:Package}=${Version}\n']).split('\n').filter(x => !/^libfontenc1(?::[a-z0-9-]+)?=/.test(x)).sort();
const pids = () => run('systemctl', ['show', 'docker.service', 'ssh.service', '-p', 'Id', '-p', 'MainPID']);
function noHostConsumer() {
  const own = fs.statSync('/');
  for (const id of fs.readdirSync('/proc').filter(x => /^\d+$/.test(x))) try {
    const r = fs.statSync('/proc/' + id + '/root');
    if (r.dev !== own.dev || r.ino !== own.ino) continue;
    assert(!fs.readFileSync('/proc/' + id + '/maps', 'utf8').includes('libfontenc.so'), 'Host libfontenc consumer is active');
  } catch (error) {if (!['ENOENT', 'ESRCH'].includes(error.code)) throw error;}
}
function files(base) {
  const out = [];
  function visit(dir) {for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name), s = fs.lstatSync(p), rel = p.slice(base.length);
    if (s.isDirectory()) visit(p);
    else if (s.isSymbolicLink()) out.push({path: rel, link: fs.readlinkSync(p), mode: s.mode & 0o7777});
    else if (s.isFile()) out.push({path: rel, sha256: sha(p), mode: s.mode & 0o7777});
    else throw Error('Unexpected package member: ' + rel);
  }}
  visit(base); return out.sort((a, b) => a.path.localeCompare(b.path));
}
function exact(rows) {for (const row of rows) {
  const s = fs.lstatSync(row.path); assert.equal(s.mode & 0o7777, row.mode, row.path);
  if (row.link !== undefined) assert.equal(fs.readlinkSync(row.path), row.link);
  else assert.equal(sha(row.path), row.sha256, row.path);
}}
function symbols(file) {return new Set(run('nm', ['-D', '--defined-only', file]).split('\n').filter(Boolean).map(x => x.trim().split(/\s+/).at(-1)));}
function deps(file) {return [...run('readelf', ['-d', file]).matchAll(/\((NEEDED|SONAME)\).*\[([^\]]+)\]/g)].map(x => x[1] + ':' + x[2]).sort();}
const native = libraryFile => {
  const code = 'import ctypes,os,sys;p=sys.argv[1];c=ctypes.CDLL(p);assert os.path.realpath(p) in open("/proc/self/maps").read();c.FontEncMapFind.argtypes=[ctypes.c_char_p,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_char_p];c.FontEncMapFind.restype=ctypes.c_void_p;c.FontEncRecode.argtypes=[ctypes.c_uint,ctypes.c_void_p];c.FontEncRecode.restype=ctypes.c_uint;m=c.FontEncMapFind(b"iso8859-1",1,0,0,None);assert m and c.FontEncRecode(65,m)==65 and c.FontEncRecode(241,m)==241;print("passed")';
  assert.equal(run('runuser', ['-u', 'nobody', '--', 'python3', '-c', code, libraryFile]), 'passed');
};
const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
const temporary = fs.mkdtempSync('/tmp/utilibre-fontenc-host-');
fs.chmodSync(temporary, 0o755);
try {
  assert(fs.statfsSync('/').bavail * fs.statfsSync('/').bsize >= 8 * 1024 ** 3, 'Recovery disk floor');
  assert.equal(run('dpkg', ['--audit']), '');
  assert.equal(sha(old), oldHash); assert.equal(sha(next), nextHash);
  const build = read(root + '/package-9a53935cc80bd9a2/package-build.json');
  assert(build.passed && build.network === 'none' && build.nativeChecks.join(',') === 'ordinary,boundary');
  assert.equal(build.packages.find(x => x.file === path.basename(next))?.sha256, nextHash);
  assert.equal(build.patchSha256, sha(root + '/source/fontenc-fix.patch'));
  assert.equal(run('dpkg-deb', ['-f', old, 'Version']).split('\n').at(-1), oldVersion);
  assert.equal(run('dpkg-deb', ['-f', next, 'Version']).split('\n').at(-1), nextVersion);
  assert.equal(run('dpkg-deb', ['-f', next, 'Package']).split('\n').at(-1), 'libfontenc1');
  assert.equal(run('dpkg-deb', ['-f', next, 'Depends']), run('dpkg-deb', ['-f', old, 'Depends']));
  for (const [tag, archive] of [['old', old], ['new', next]]) {
    run('dpkg-deb', ['-x', archive, temporary + '/' + tag]);
    run('dpkg-deb', ['-e', archive, temporary + '/' + tag + '-control']);
    assert.deepEqual(fs.readdirSync(temporary + '/' + tag + '-control').sort(), ['control', 'md5sums', 'shlibs', 'triggers']);
  }
  const oldFiles = files(temporary + '/old'), newFiles = files(temporary + '/new');
  assert.deepEqual(oldFiles.map(x => x.path).filter(x => !x.endsWith('/changelog.Debian.amd64.gz')), newFiles.map(x => x.path));
  const relative = '/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0';
  const priorSymbols = symbols(temporary + '/old' + relative), laterSymbols = symbols(temporary + '/new' + relative);
  assert(priorSymbols.size > 10 && [...priorSymbols].every(x => laterSymbols.has(x)));
  assert.deepEqual(deps(temporary + '/old' + relative), deps(temporary + '/new' + relative));
  assert(!run('ldd', [temporary + '/new' + relative]).includes('not found'));
  const common = {oldHash, nextHash, oldVersion, nextVersion, oldFiles, newFiles,
    recipeSha256: sha(fileURLToPath(import.meta.url)), buildSha256: sha(root + '/package-9a53935cc80bd9a2/package-build.json'),
    otherInventorySha256: digest(JSON.stringify(inventory())), servicePids: pids(), exportsPreserved: priorSymbols.size};
  const receipt = output + '/release.json', checked = output + '/check.json';
  if (mode === 'verify') {
    const r = read(receipt); assert.equal(r.status, 'passed');
    for (const [key, value] of Object.entries(common)) assert.deepEqual(r[key], value, key);
    assert.equal(version(), nextVersion); exact(newFiles); assert.equal(run('dpkg', ['-V', 'libfontenc1']), '');
    native('/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0'); noHostConsumer(); console.log(JSON.stringify({status: 'passed', version: nextVersion, noServiceRestart: true}));
  } else {
    assert(!fs.existsSync(receipt), 'Release already exists; use verify');
    assert.equal(version(), oldVersion); exact(oldFiles); assert.equal(run('dpkg', ['-V', 'libfontenc1']), '');
    noHostConsumer(); native(temporary + '/new/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0');
    const simulation = run('apt-get', ['--simulate', '--no-download', 'install', next]);
    assert.deepEqual(simulation.split('\n').filter(x => x.startsWith('Inst ')).map(x => x.split(' ')[1]), ['libfontenc1']);
    assert(!/^Remv /m.test(simulation));
    if (mode === 'check') {
      save(checked, {...common, date: new Date().toISOString(), passed: true, productionChanged: false});
      console.log('Host libfontenc preflight passed; one package only, no service change.');
    } else {
      const proof = read(checked); assert(proof.passed && Date.now() - Date.parse(proof.date) < 15 * 60000);
      for (const [key, value] of Object.entries(common)) assert.deepEqual(proof[key], value, key);
      const r = {...common, status: 'installing', startedAt: new Date().toISOString()}; save(receipt, r);
      try {
        run('dpkg', ['--install', next], {env: {DEBIAN_FRONTEND: 'noninteractive'}});
        assert.equal(version(), nextVersion); exact(newFiles); assert.equal(run('dpkg', ['-V', 'libfontenc1']), '');
        assert.equal(digest(JSON.stringify(inventory())), common.otherInventorySha256);
        assert.equal(pids(), common.servicePids); native('/usr/lib/x86_64-linux-gnu/libfontenc.so.1.0.0'); noHostConsumer();
        run('python3', [path.resolve(here, '../../../scripts/maintenance-update-policy.py'), '--write-unattended-blacklist']);
        assert(fs.readFileSync('/etc/apt/apt.conf.d/99-utilibre-protected-packages', 'utf8').includes('^libfontenc1'));
        r.status = 'passed'; r.completedAt = new Date().toISOString(); r.noServiceRestart = true; save(receipt, r);
        console.log(JSON.stringify({status: 'passed', version: nextVersion, noServiceRestart: true}));
      } catch (error) {
        r.status = 'failed'; r.error = String(error.message).slice(0, 300);
        try {run('dpkg', ['--install', old]); assert.equal(version(), oldVersion); exact(oldFiles); r.rollback = 'verified';}
        catch {r.rollback = 'unverified';}
        save(receipt, r); throw Error('Host libfontenc release failed; inspect private receipt');
      }
    }
  }
} finally {
  assert(path.dirname(temporary) === '/tmp' && path.basename(temporary).startsWith('utilibre-fontenc-host-'));
  fs.rmSync(temporary, {recursive: true}); unlock();
}

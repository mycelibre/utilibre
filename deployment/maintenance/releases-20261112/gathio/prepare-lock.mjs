// Resolve the two reviewed upstream leaves in a disposable, bounded container.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const recorded = process.argv.length === 3 && process.argv[2] === '--record-existing';
assert(process.argv.length === 2 || recorded);
const here = new URL('.', import.meta.url).pathname;
const inputs = JSON.parse(fs.readFileSync(here + 'inputs.json'));
const source = '/opt/utilibre/calendar-src/gathio';
const root = '/var/lib/utilibre-maintenance/releases-20261112/gathio';
const sha = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const run = (exe, args, options = {}) => cp.execFileSync(exe, args, {
  encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 ** 2,
  stdio: ['ignore', 'pipe', 'pipe'], ...options,
}).trim();
assert.equal(run('git', ['-C', source, 'rev-parse', 'HEAD']), inputs.upstreamRevision);
assert.equal(sha('deployment/calendar/gathio/privacy-security.patch'), inputs.basePrivacyPatchSha256);
for (const [file, hash] of Object.entries(inputs.sourceFiles)) assert.equal(sha(source + '/' + file), hash);
const free = fs.statfsSync('/'); assert(free.bavail * free.bsize > 8.3 * 1024 ** 3);
if (!recorded) {
assert(!fs.existsSync(root + '/lock-output'), 'Preserve the previous resolved lock');
for (const p of ['lock-input', 'lock-output', 'pnpm']) fs.mkdirSync(root + '/' + p, {mode: 0o755});
for (const p of ['lock-input', 'pnpm']) fs.chmodSync(root + '/' + p, 0o755);
fs.chownSync(root + '/lock-output', 1000, 1000);
for (const [file, hash] of Object.entries(inputs.sourceFiles)) {
  assert.equal(sha(source + '/' + file), hash);
  fs.copyFileSync(source + '/' + file, root + '/lock-input/' + file);
  fs.chmodSync(root + '/lock-input/' + file, 0o644);
}
const archive = root + '/pnpm.tgz';
let bytes;
if (fs.existsSync(archive)) bytes = fs.readFileSync(archive);
else {
  const response = await fetch(inputs.pnpm.tarball, {signal: AbortSignal.timeout(20000)});
  assert(response.ok); bytes = Buffer.from(await response.arrayBuffer());
}
assert(bytes.length < 8 * 1024 ** 2);
assert.equal('sha512-' + createHash('sha512').update(bytes).digest('base64'), inputs.pnpm.integrity);
fs.writeFileSync(archive, bytes);
assert(run('tar', ['-tzf', archive]).split('\n').every(p => p.startsWith('package/') && !p.split('/').includes('..')));
run('tar', ['--no-same-owner', '-xzf', archive, '--strip-components=1', '-C', root + '/pnpm']);
function readableTool(path) {
  const stat = fs.lstatSync(path);
  assert(stat.isFile() || stat.isDirectory(), 'Unexpected package entry');
  fs.chmodSync(path, stat.isDirectory() || stat.mode & 0o111 ? 0o755 : 0o644);
  if (stat.isDirectory()) for (const name of fs.readdirSync(path)) readableTool(path + '/' + name);
}
readableTool(root + '/pnpm');
const args = ['run', '--rm', '--name', 'maintenance-gathio-lock-20261112',
  '--read-only', '--user', '1000:1000', '--cpus', '1', '--memory', '1g', '--memory-swap', '1g',
  '--pids-limit', '128', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--log-driver', 'none',
  '--tmpfs', '/work:rw,exec,size=256m,uid=1000,gid=1000,mode=0700',
  '-e', 'CI=true', '-e', 'PNPM_DISABLE_SELF_UPDATE_CHECK=1', '-e', 'npm_config_update_notifier=false',
  '-v', root + '/lock-input:/input:ro', '-v', root + '/lock-output:/output',
  '-v', root + '/pnpm:/tool:ro', '-v', here + 'resolve-lock.sh:/resolve.sh:ro',
  '--entrypoint', 'sh', inputs.spec.base, '/resolve.sh'];
try {
  fs.writeFileSync(root + '/lock-resolution.log', run('docker', args) + '\n');
} catch (error) {
  fs.writeFileSync(root + '/lock-resolution.log', String(error.stdout || '') + String(error.stderr || error));
  try { run('docker', ['rm', '-f', 'maintenance-gathio-lock-20261112']); } catch {}
  throw Error('Bounded lock resolution failed; private diagnostic retained');
}
}
for (const [file, hash] of Object.entries(inputs.sourceFiles)) assert.equal(sha(root + '/lock-input/' + file), hash);
const beforePackage = JSON.parse(fs.readFileSync(root + '/lock-input/package.json'));
const afterPackage = JSON.parse(fs.readFileSync(root + '/lock-output/package.json'));
assert.equal(afterPackage.dependencies.mongoose, '6.13.12');
afterPackage.dependencies.mongoose = beforePackage.dependencies.mongoose;
assert.deepEqual(afterPackage, beforePackage);
const before = fs.readFileSync(root + '/lock-input/pnpm-lock.yaml', 'utf8');
const after = fs.readFileSync(root + '/lock-output/pnpm-lock.yaml', 'utf8');
let expected = before;
const exact = (from, to, count) => {
  assert.equal(expected.split(from).length - 1, count, 'Unexpected lock precondition');
  expected = expected.split(from).join(to);
};
exact('specifier: ^6.13.11', 'specifier: 6.13.12', 1);
exact('6.13.11', '6.13.12', 3);
exact('mquery@4.0.3', 'mquery@4.0.4', 2);
exact('mquery: 4.0.3', 'mquery: 4.0.4', 1);
exact('sha512-5KM1Oq106FCdiy4//geOam3mPFekkSY0a4L+zQQPrc6tB6AJtg772aMgeUHF2sTNSxFhJQsAOjpLJpK6Cz+hRw==', inputs.packages.mongoose.integrity, 1);
exact('sha512-J5heI+P08I6VJ2Ky3+33IpCdAvlYGTSUjwTPxkAr8i8EoduPMBX2OY/wa3IKZIQl7MU4SbFk8ndgSKyB/cl1zA==', inputs.packages.mquery.integrity, 1);
// Native pnpm also refreshes this exact registry warning. No dependency or
// integrity changed here; retain the warning rather than strip advisory data.
exact("  '@smithy/core@3.35.2':\n    resolution: {integrity: sha512-ejTukBuP/Pg3t9N8Ux+0zKsXeHWm7p6W3HbXFOyltKasSxZwCFmvTut7kBdZSCF3m9y1bXXyVu6p2xuMFcsTyQ==}\n    engines: {node: '>=18.0.0'}", "  '@smithy/core@3.35.2':\n    resolution: {integrity: sha512-ejTukBuP/Pg3t9N8Ux+0zKsXeHWm7p6W3HbXFOyltKasSxZwCFmvTut7kBdZSCF3m9y1bXXyVu6p2xuMFcsTyQ==}\n    engines: {node: '>=18.0.0'}\n    deprecated: |-\n      Deprecated due to a bug in custom logger data redaction. Upgrade to the latest version. If you used a custom logger with this\n        version, review your logs and rotate any credentials or other secrets. See https://github.com/aws/aws-sdk-js-v3/issues/8393.", 1);
assert.equal(after, expected, 'Package manager changed unrelated lock entries');
const patch = [];
for (const file of ['package.json', 'pnpm-lock.yaml']) {
  const diff = cp.spawnSync('git', ['diff', '--no-index', '--', root + '/lock-input/' + file, root + '/lock-output/' + file], {encoding: 'utf8', timeout: 10000, maxBuffer: 1024 ** 2});
  assert.equal(diff.status, 1);
  patch.push(diff.stdout.replaceAll('a' + root + '/lock-input/', 'a/').replaceAll('b' + root + '/lock-output/', 'b/'));
}
fs.writeFileSync(here + 'source-update.patch', patch.join(''));
run('git', ['apply', '--check', here + 'source-update.patch'], {cwd: root + '/lock-input'});
const result = {date: new Date().toISOString(), passed: true, deployed: false,
  previousInputs: inputs.sourceFiles, sourcePatchSha256: sha(here + 'source-update.patch'),
  outputs: Object.fromEntries(['package.json', 'pnpm-lock.yaml'].map(p => [p, sha(root + '/lock-output/' + p)])),
  packagesChanged: {mongoose: ['6.13.11', '6.13.12'], mquery: ['4.0.3', '4.0.4']},
  otherDependencyIdentitiesUnchanged: true, metadataChanges: ['Existing @smithy/core 3.35.2 native registry deprecation warning'], lifecycleScripts: false, productionChanged: false};
fs.writeFileSync(root + '/source-lock.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));

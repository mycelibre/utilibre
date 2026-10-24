// Offline, bounded regression check for the source-archive version stamp.
// Usage: node config/redlib/check-build-revision.mjs ARCHIVE REPORT_DIRECTORY
// RUSTC may select an installed compiler. No Cargo dependency resolution,
// container operations, upstream requests, or production changes occur here.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.argv.length, 4, 'Provide archive and a new report directory');
const archive = resolve(process.argv[2]);
const report = resolve(process.argv[3]);
const here = dirname(fileURLToPath(import.meta.url));
const recipe = JSON.parse(readFileSync(resolve(here, 'recipe.json'), 'utf8'));
const revision = recipe.source.revision;
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
assert.equal(sha(archive), recipe.source.sha256);
assert(!existsSync(report), 'Never overwrite an existing report');
mkdirSync(report, { mode: 0o700 });
const source = resolve(report, `redlib-${revision}`);
const rustc = process.env.RUSTC || 'rustc';
const env = { PATH: '/usr/bin:/bin', LANG: 'C.UTF-8', GIT_CONFIG_NOSYSTEM: '1', GIT_CEILING_DIRECTORIES: report };
const run = (command, args, options = {}) => execFileSync('unshare', ['--net', '--', command, ...args], {
  cwd: source, env, encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024, ...options,
});
execFileSync('tar', ['-xzf', archive, '-C', report], { timeout: 10000 });
const lockHash = sha(resolve(source, 'Cargo.lock'));
run(rustc, ['build.rs', '-o', resolve(report, 'before')]);
const before = run(resolve(report, 'before'), [], { env: { ...env, REDLIB_BUILD_REVISION: revision } });
assert.match(before, /cargo:rustc-env=GIT_HASH=dev\n/);

for (const file of ['0001-reject-scheme-relative-settings-redirects.patch', '0002-archive-build-revision.patch']) {
  const patch = resolve(here, 'patches', file);
  run('git', ['apply', '--check', patch]);
  run('git', ['apply', patch]);
}
run(rustc, ['--test', 'build.rs', '-o', resolve(report, 'tests')]);
const tests = run(resolve(report, 'tests'), []);
assert.match(tests, /5 passed; 0 failed/);
run(rustc, ['build.rs', '-o', resolve(report, 'after')]);
const fixedEnv = { ...env, REDLIB_BUILD_REVISION: revision };
const after = run(resolve(report, 'after'), [], { env: fixedEnv });
assert.match(after, new RegExp(`cargo:rustc-env=GIT_HASH=${revision}\\n`));
assert.equal(run(resolve(report, 'after'), [], { env: fixedEnv }), after);
assert.throws(() => run(resolve(report, 'after'), [], { env: { ...env, REDLIB_BUILD_REVISION: 'main' }, stdio: 'pipe' }));
assert.equal(sha(resolve(source, 'Cargo.lock')), lockHash);
run('git', ['apply', '--reverse', '--check', resolve(here, 'patches/0002-archive-build-revision.patch')]);
writeFileSync(resolve(report, 'tests.txt'), tests, { mode: 0o600 });
const result = {
  checkedAt: new Date().toISOString(), revision, archiveSha256: sha(archive),
  patchSha256: sha(resolve(here, 'patches/0002-archive-build-revision.patch')),
  cargoLockSha256: lockHash, rustc: run(rustc, ['--version']).trim(),
  passed: true, unitTests: 5, originalBugReproduced: true,
  archiveRevisionCorrected: true, repeatedOutputIdentical: true,
  invalidRevisionRejected: true, redirectPatchRetained: true,
  dependencyLockUnchanged: true, network: 'disabled by network namespace',
  productionChanged: false,
  limitations: ['Build-script regression only, not a full application rebuild or restoration of Reddit thread access'],
};
writeFileSync(resolve(report, 'result.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(result, null, 2));

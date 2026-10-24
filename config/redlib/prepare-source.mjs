// Offline preparation only. No Docker, package resolution, live requests or activation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const recipe = JSON.parse(readFileSync(join(here, 'recipe.json')));
assert.equal(process.argv.length, 4, 'Usage: node prepare-source.mjs VERIFIED_ARCHIVE NEW_DIRECTORY');
const archive = resolve(process.argv[2]), destination = resolve(process.argv[3]);
const sha = value => createHash('sha256').update(value).digest('hex');
assert.equal(sha(readFileSync(archive)), recipe.source.sha256, 'Unsupported source archive');
for (const patch of recipe.patches) assert.equal(sha(readFileSync(join(here, patch.path))), patch.sha256, 'Patch changed');
const manifestHash = sha(readFileSync(join(here, 'recipe.json')));
const source = join(destination, `redlib-${recipe.source.revision}`);
const receiptPath = join(destination, 'prepared.json');
function tree(dir = source, prefix = '') {
  return Object.fromEntries(readdirSync(dir).sort().flatMap(name => {
    const path = join(dir, name), relative = prefix + name, stat = lstatSync(path);
    assert(!stat.isSymbolicLink(), 'Unexpected symlink');
    return stat.isDirectory() ? Object.entries(tree(path, relative + '/')) : [[relative, sha(readFileSync(path))]];
  }));
}
if (existsSync(destination)) {
  const receipt = JSON.parse(readFileSync(receiptPath));
  assert.equal(receipt.manifestSha256, manifestHash);
  assert.deepEqual(tree(), receipt.tree, 'Prepared tree has unexpected modifications');
  console.log('Already prepared; exact tree unchanged.');
} else {
  mkdirSync(destination, { mode: 0o700 });
  execFileSync('tar', ['--no-same-owner', '-xzf', archive, '-C', destination], { timeout: 30000 });
  const before = tree();
  for (const file of recipe.files) assert.equal(before[file.path], file.before, `Wrong baseline: ${file.path}`);
  for (const patch of recipe.patches) {
    for (const args of [['--check'], []]) execFileSync('unshare', ['--net', '--', 'git', 'apply', ...args, join(here, patch.path)], {
      cwd: source, env: { PATH: '/usr/bin:/bin', GIT_CONFIG_NOSYSTEM: '1' }, timeout: 10000, stdio: 'pipe',
    });
  }
  const after = tree();
  assert.deepEqual(Object.keys(after), Object.keys(before), 'Unexpected file creation/removal');
  const allowed = new Map(recipe.files.map(f => [f.path, f.after]));
  for (const [file, hash] of Object.entries(after)) assert.equal(hash, allowed.get(file) ?? before[file], `Unexpected output: ${file}`);
  writeFileSync(receiptPath, JSON.stringify({ manifestSha256: manifestHash, tree: after, network: 'none', deployed: false }, null, 2) + '\n', { mode: 0o600 });
  console.log('Exact source prepared. Required build, behavior and security checks remain separate.');
}

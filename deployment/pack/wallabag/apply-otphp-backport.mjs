// Reproducible two-file upstream security backport, not a version alias/audit ignore.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(process.argv[2] || '.');
const checkOnly = process.argv.includes('--check');
const patch = resolve(dirname(fileURLToPath(import.meta.url)), 'otphp-10-security.patch');
const lock = JSON.parse(await readFile(resolve(root, 'composer.lock'), 'utf8'));
const otp = lock.packages.find(p => p.name === 'spomky-labs/otphp');
assert.equal(otp?.version, 'v10.0.3', 'Unreviewed OTPHP version; do not apply this backport');
assert.equal(otp.source.reference, '9784d9f7c790eed26e102d6c78f12c754036c366', 'Unreviewed source');
const files = [
  ['src/ParameterTrait.php', '3a071b2dedb0578440628ebbf25c5b28d22e3c9c5d39181b41304c05230f909d', '0a4884236f433f20b0f176c57a3c92874f0628d3effbbfce2ade54942f7f5484'],
  ['src/Factory.php', '31728539521a7cec96f76d52c9f83f07c13955542e87a0c2d74c7e2e8985c348', '404ea47d4c2ca60ae2c728a1cbed5faccc99d035684a51872b31caa041cd77e3'],
];
const vendor = resolve(root, 'vendor/spomky-labs/otphp');
async function hashes() {
  return Promise.all(files.map(async ([file]) => createHash('sha256').update(await readFile(resolve(vendor, file))).digest('hex')));
}
let actual = await hashes();
if (!actual.every((hash, i) => hash === files[i][2])) {
  assert(!checkOnly, 'Security backport missing or altered');
  assert(actual.every((hash, i) => hash === files[i][1]), 'Unknown or partially patched source; refusing to overwrite');
  execFileSync('git', ['apply', '--check', patch], {cwd: vendor});
  execFileSync('git', ['apply', patch], {cwd: vendor});
  actual = await hashes();
}
assert(actual.every((hash, i) => hash === files[i][2]), 'Post-patch hash mismatch');
console.log('OTPHP 10.0.3: reviewed security-backport hashes match. Native audit findings remain visible.');

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {proveLibraries} from './libraries-policy.mjs';

// Private recorded synthetic compatibility evidence; no containers or network.
const inputs = JSON.parse(fs.readFileSync(new URL('./libraries-inputs.json', import.meta.url)));
function example(key = 'toolbox-bentopdf') {
  const spec = structuredClone(inputs.rows.find(r => r.key === key));
  spec.releaseApproval = 'approved';
  const dir = '/var/lib/utilibre-maintenance/libraries-20261111/' + key;
  const read = name => JSON.parse(fs.readFileSync(dir + '/' + name + '.json'));
  return [structuredClone(inputs), spec, {build: read('build'), scope: read('scope'), consumer: read('consumer'), scan: read('scan-gate')}, Date.parse(read('scan-gate').date)];
}
for (const key of ['toolbox-bentopdf', 'public-utility-portal']) {
  test(key + ': exact recorded candidate passes twice without mutations', () => {
    const args = example(key), before = JSON.stringify(args);
    proveLibraries(...args); proveLibraries(...args); assert.equal(JSON.stringify(args), before);
  });
}
const failures = {
  'unapproved release': a => {a[1].releaseApproval = 'pending-verification';},
  'operator hold': a => {a[1].ownerHold = 'review';},
  'unsupported baseline': a => {a[1].base = 'sha256:' + '0'.repeat(64);},
  'unrelated application change': a => {a[2].scope.allUnrelatedImageFilesUnchanged = false;},
  'additional package scope': a => {a[2].scope.packages.push('musl');},
  'unexpected package version': a => {a[2].build.pins[0].version = '9.9';},
  'missing consumer result': a => {a[2].consumer.rows.pop();},
  'failed XPM round-trip': a => {a[2].consumer.xpmRows[0].passed = false;},
  'scanner failure': a => {a[2].scan.passed = false;},
  'partial native inventory': a => {a[2].scan.nativeApkInventoryComplete = false;},
  'new high finding': a => {a[2].scan.newHighCritical = 1;},
  'remaining critical finding': a => {a[2].scan.remainingCritical = 1;},
  'changed advisory snapshot': a => {a[2].scan.databaseSha256 = '0'.repeat(64);},
  'expired advisory snapshot': a => {a[3] += 72 * 3600000;},
  'future advisory snapshot': a => {a[3] = 0;},
};
for (const [name, mutate] of Object.entries(failures)) test('rejects ' + name, () => {
  const args = example(); mutate(args); assert.throws(() => proveLibraries(...args));
});

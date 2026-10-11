// Only run while building a candidate, never in a running service.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const {createRequire} = require('node:module');
const integrity = 'sha512-5nnx0yGyVUcY6t9RnWcARWtwT9F1D8O9rt08htPvnd49W1IgZtmLkhu9WfMzQj1cFxjHIO6connUNVW5k7AVyQ==';
const url = 'https://registry.npmjs.org/proxy-addr/-/proxy-addr-2.0.8.tgz';
(async () => {
  assert(['/app', '/grist'].includes(process.cwd()));
  const local = createRequire(path.join(process.cwd(), 'package.json'));
  const target = path.dirname(local.resolve('proxy-addr/package.json'));
  assert.equal(target, path.join(process.cwd(), 'node_modules/proxy-addr'));
  const old = local('proxy-addr/package.json');
  assert.equal(old.version, '2.0.7');
  assert.deepEqual(old.dependencies, {forwarded: '0.2.0', 'ipaddr.js': '1.9.1'});
  const response = await fetch(url, {signal: AbortSignal.timeout(30000), redirect: 'error'});
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.length < 100000);
  assert.equal('sha512-' + crypto.createHash('sha512').update(bytes).digest('base64'), integrity);
  const archive = '/tmp/utilibre-proxy-addr-2.0.8.tgz';
  fs.writeFileSync(archive, bytes);
  // Official hash-pinned release, retaining upstream MIT licence and attribution.
  execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', target]);
  fs.unlinkSync(archive);
  const updated = JSON.parse(fs.readFileSync(path.join(target, 'package.json')));
  assert.equal(updated.version, '2.0.8');
  assert.deepEqual(updated.dependencies, old.dependencies);
  for (const file of ['package-lock.json', 'node_modules/.package-lock.json']) {
    if (!fs.existsSync(file)) continue;
    const lock = JSON.parse(fs.readFileSync(file));
    const pkg = lock.packages?.['node_modules/proxy-addr'];
    if (!pkg) continue;
    assert.equal(pkg.version, '2.0.7');
    Object.assign(pkg, {version: '2.0.8', resolved: url, integrity});
    fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
  }
  console.log('Pinned proxy-addr 2.0.8 installed; dependencies unchanged.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });

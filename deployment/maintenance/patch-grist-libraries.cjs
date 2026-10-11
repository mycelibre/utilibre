// Build-only, three reviewed patch releases. No resolver, sandbox change or migration.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {createRequire} = require('node:module');
const entries = [
  ['handlebars', '4.7.9', '4.7.10', 'P5VJMVM7qgBn6vjXMw8WG9uVI+ncf2pi72j4de4yz5ZULLj2RGqLYaKOYGsgyrViQ0tePOVlN1tDCCXXtFqXKg=='],
  ['piscina', '4.9.3', '4.9.4', 'RyBDr2VheQ8ZfH3N8SzQZHztqVyOtadTwLnUYof6gdj5161/eu2wNhCbGl5GHnNKDpnkicJYpKtL2J+y/gk6XA=='],
  ['shell-quote', '1.10.0', '1.11.0', 'JdxDPD0DBTyu08pq0kPC0xSNet/qsU07qT6IsX1AS8oO2ICNRY4ldNa8OAI6PuwAH8tG3lxEhbqmyp4Dw4036g=='],
];
(async () => {
  assert.equal(process.cwd(), '/grist');
  const semver = require('/grist/node_modules/semver');
  for (const [name, before, after, hash] of entries) {
    const target = '/grist/node_modules/' + name;
    const old = JSON.parse(fs.readFileSync(target + '/package.json'));
    assert.equal(old.version, before);
    const url = `https://registry.npmjs.org/${name}/-/${name}-${after}.tgz`;
    const r = await fetch(url, {signal: AbortSignal.timeout(30000), redirect: 'error'});
    assert.equal(r.status, 200);
    const bytes = Buffer.from(await r.arrayBuffer());
    assert(bytes.length < 4000000);
    assert.equal(crypto.createHash('sha512').update(bytes).digest('base64'), hash);
    const archive = '/tmp/utilibre-' + name + '.tgz';
    fs.writeFileSync(archive, bytes);
    execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', target]);
    fs.unlinkSync(archive);
    const updated = JSON.parse(fs.readFileSync(target + '/package.json'));
    assert.equal(updated.version, after);
    assert.equal(updated.license, 'MIT');
    const local = createRequire(target + '/package.json');
    for (const [dependency, range] of Object.entries(updated.dependencies || {})) {
      // Dependencies are already present; never silently install a new tree.
      assert(semver.satisfies(local(dependency + '/package.json').version, range), dependency);
    }
    for (const file of ['/grist/package-lock.json', '/grist/node_modules/.package-lock.json']) {
      if (!fs.existsSync(file)) continue;
      const lock = JSON.parse(fs.readFileSync(file));
      const pkg = lock.packages?.['node_modules/' + name];
      if (!pkg) continue;
      assert.equal(pkg.version, before);
      Object.assign(pkg, {version: after, resolved: url, integrity: 'sha512-' + hash});
      if (updated.dependencies) pkg.dependencies = updated.dependencies;
      fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
    }
    console.log(name + ' ' + after + ': pinned release installed, dependencies satisfied');
  }
})().catch(error => {console.error(error.message); process.exitCode = 1;});

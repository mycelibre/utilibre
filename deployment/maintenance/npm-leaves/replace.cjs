// Replace physical package directories: do not leave old package metadata behind.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const mode = process.argv[2];
const selected = {
  kuma: [
    ['/app/node_modules/axios', '0.32.0', 'axios'],
    ['/app/node_modules/liquidjs', '10.26.0', 'liquidjs'],
    ['/app/node_modules/redbean-node/node_modules/lodash', '4.17.23', 'lodash'],
    ['/app/node_modules/minimatch', '9.0.3', 'minimatch'],
    ['/app/node_modules/mysql2', '3.11.5', 'mysql2'],
    ['/app/node_modules/ws', '8.19.0', 'ws'],
    ['/app/node_modules/redbean-node/node_modules/glob', '10.3.16', 'glob'],
    ['/usr/local/lib/node_modules/npm/node_modules/brace-expansion', '2.0.2', 'brace-expansion'],
    ['/usr/local/lib/node_modules/npm/node_modules/ip-address', '10.1.0', 'ip-address'],
    ['/usr/local/lib/node_modules/npm/node_modules/picomatch', '4.0.3', 'picomatch'],
  ],
  actual: [
    ['/app/node_modules/axios', '1.18.1', 'axios'],
    ['/app/node_modules/body-parser', '2.2.1', 'body-parser'],
    ['/app/node_modules/qs', '6.15.3', 'qs'],
    ['/usr/local/lib/node_modules/npm/node_modules/undici', '6.27.0', 'undici'],
    ['/app/node_modules/brace-expansion', '2.0.3', 'brace-expansion-v2'],
    ['/usr/local/lib/node_modules/npm/node_modules/brace-expansion', '5.0.7', 'brace-expansion'],
    ['/usr/local/lib/node_modules/npm/node_modules/ip-address', '10.2.0', 'ip-address'],
    ['/usr/local/lib/node_modules/npm/node_modules/tar', '7.5.19', 'tar'],
  ],
};
assert(selected[mode], 'Finite reviewed application required');
assert.equal(require('/app/package.json').version, mode === 'kuma' ? '2.5.6' : '26.10.0');
const deps = '/opt/utilibre-reviewed-leaves/node_modules';
for (const [target, oldVersion, name] of selected[mode]) {
  assert.equal(fs.lstatSync(target).isSymbolicLink(), false, target);
  assert.equal(require(target + '/package.json').version, oldVersion, target);
  fs.rmSync(target, {recursive: true});
  fs.cpSync(deps + '/' + name, target, {recursive: true});
  if (!fs.existsSync(target + '/node_modules')) fs.symlinkSync(deps, target + '/node_modules');
  assert.equal(JSON.parse(fs.readFileSync(target + '/package.json')).version,
    JSON.parse(fs.readFileSync(deps + '/' + name + '/package.json')).version);
}

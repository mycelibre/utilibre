// Additional native 2.5.6 release/parser gates; synthetic input only.
const assert = require('node:assert/strict');
assert.equal(require('/app/package.json').version, '2.5.6');
assert.equal(process.version, 'v22.23.2');
assert.equal(require('/app/node_modules/qs/package.json').version, '6.16.0');
assert.equal(require('/usr/local/lib/node_modules/npm/node_modules/tar/package.json').version, '7.5.21');
for (const [name, version] of [['express','4.22.3'], ['body-parser','1.20.8'], ['engine.io','6.6.10'], ['proxy-addr','2.0.8']]) {
  assert.equal(require('/app/node_modules/' + name + '/package.json').version, version);
}
const qs = require('/app/node_modules/qs');
const fixture = {label: 'Fictional café', filters: {active: 'true'}, values: ['one','two']};
assert.deepEqual(qs.parse(qs.stringify(fixture)), fixture);
qs.parse('__proto__[utilibreTest]=bad&constructor[prototype][utilibreTest]=bad');
assert.equal({}.utilibreTest, undefined);
require('/app/node_modules/@louislam/sqlite3');
console.log('Kuma 2.5.6 runtime, native SQLite, release dependencies and qs round-trip/prototype checks passed');

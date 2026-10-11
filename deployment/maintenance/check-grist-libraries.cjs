// Run inside the candidate with --network none and a small disposable /tmp.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const handlebars = require('/grist/node_modules/handlebars');
const shell = require('/grist/node_modules/shell-quote');
const Piscina = require('/grist/node_modules/piscina');
assert.equal(handlebars.VERSION, '4.7.10');
assert.equal(handlebars.compile('Hello {{name}}')({name: '<Fictional>'}), 'Hello &lt;Fictional&gt;');
const input = ['fictional', 'two words', 'a;b', 'mañana'];
assert.deepEqual(shell.parse(shell.quote(input)), input);
fs.writeFileSync('/tmp/worker.cjs', 'module.exports = value => value * 3');
(async () => {
  const pool = new Piscina({filename: '/tmp/worker.cjs', maxThreads: 1});
  assert.equal(await pool.run(7), 21);
  await pool.destroy();
  console.log('Native template escaping, shell-quote round trip and real worker computation passed');
})().catch(error => {console.error(error.message); process.exitCode = 1;});

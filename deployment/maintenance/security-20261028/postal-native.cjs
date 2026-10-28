// Synthetic MIME only. Operation counts avoid unreliable timing thresholds.
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.argv[2];
const pkg = require(path.join(root, 'package.json'));
const api = require(root), PostalMime = api.default || api;
const decode = api.decodeWords || require(path.join(root, 'dist/cjs/decode-strings.js')).decodeWords;
(async () => {
  let normalChecks = 0;
  for (const [input, output] of [
    ['Plain fictional subject', 'Plain fictional subject'],
    ['=?utf-8?B?SGVs?= =?utf-8?B?bG8=?= =?utf-8?B?IQ==?=', 'Hello!'],
    ['=?utf-8?Q?Espa=C3=B1ol?=', 'Español'],
    ['=?utf-8?B?SGVs?= =?utf-8?B??= =?utf-8?B?bG8=?=', 'Hello'],
  ]) { assert.equal(decode(input), output); normalChecks++; }
  const text = await PostalMime.parse('From: Fictional <fictional@example.invalid>\r\nTo: reader@example.invalid\r\nSubject: =?utf-8?Q?Reuni=C3=B3n?=\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nDatos ficticios: á ñ.');
  assert.equal(text.subject, 'Reunión'); assert(text.text.includes('Datos ficticios: á ñ.')); normalChecks++;
  const multipart = await PostalMime.parse('MIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=fictional\r\n\r\n--fictional\r\nContent-Type: text/plain\r\n\r\nExample\r\n--fictional\r\nContent-Type: application/octet-stream\r\nContent-Disposition: attachment; filename="example.txt"\r\nContent-Transfer-Encoding: base64\r\n\r\nRmljdGlvbmFsCg==\r\n--fictional--\r\n');
  assert.equal(multipart.attachments.length, 1); assert.equal(multipart.attachments[0].filename, 'example.txt');
  assert.equal(Buffer.from(multipart.attachments[0].content).toString(), 'Fictional\n'); normalChecks++;
  const costs = [];
  for (const count of [1000, 2000]) {
    let scannedCharacters = 0;
    const original = RegExp.prototype.test;
    try {
      RegExp.prototype.test = function (value) {
        if (this.source === '=$') scannedCharacters += String(value).length;
        return original.call(this, value);
      };
      assert.equal(decode('=?utf-8?B?QUJD?= '.repeat(count).trim()), 'ABC'.repeat(count));
    } finally { RegExp.prototype.test = original; }
    costs.push({count, scannedCharacters});
  }
  // Also exercise the full parser, with a modest synthetic message.
  const message = await PostalMime.parse('Subject: ' + '=?utf-8?B?QUJD?= '.repeat(2000).trim() + '\r\n\r\nFictional body');
  assert.equal(message.subject, 'ABC'.repeat(2000)); normalChecks++;
  console.log(JSON.stringify({passed: true, version: pkg.version, normalChecks, costs,
    repeatedGrowingStringScan: costs[1].scannedCharacters > 1000000,
    scope: 'Exact installed MIME API, no SMTP or network; bounded synthetic inputs'}));
})().catch(e => { console.error(e); process.exitCode = 1; });

// Bounded public HTTPS API test with disposable accounts and opaque dummy data.
// Does not test Android GPS, push delivery, or the client's cryptography.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
const config = readFileSync('/opt/utilibre/community-data/fmd-private/config.yml', 'utf8');
const registrationToken = JSON.parse(config.match(/^RegistrationToken:\s*("[^"]+")$/m)?.[1] || 'null');
assert.ok(registrationToken);
const base = 'https://fmd.utilibre.org/api/v2';
const accounts = [];
async function request(path, method = 'GET', body, token) {
  return fetch(base + path, { method, signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
}
function data() { return { username: 'utilibreqa' + randomBytes(8).toString('hex'),
  salt64: randomBytes(16).toString('base64'), passwordHash64: randomBytes(32).toString('base64'),
  encMasterKey64: randomBytes(64).toString('base64'), protoVersion: 2, registrationToken }; }
try {
  assert.equal((await request('/account/register', 'POST', { ...data(), registrationToken: 'invalid-invitation-test' })).status, 401);
  for (let i = 0; i < 2; i++) {
    const account = data();
    const response = await request('/account/register', 'POST', account);
    assert.equal(response.status, 200, 'Synthetic registration must succeed');
    const result = await response.json();
    accounts.push({ username: account.username, token: result.accessToken });
    assert.ok(result.accessToken);
  }
  const item = { clientItemIdHex: randomBytes(16).toString('hex'), unixMillis: Date.now(), ciphertext64: randomBytes(48).toString('base64') };
  assert.equal((await request('/data/location', 'POST', { items: [item] }, accounts[0].token)).status, 200);
  const own = await (await request('/data/location', 'GET', undefined, accounts[0].token)).json();
  assert.equal(own.items[0].ciphertext64, item.ciphertext64);
  const other = await (await request('/data/location', 'GET', undefined, accounts[1].token)).json();
  assert.equal(other.items?.length || 0, 0, 'Other account must not see the record');
  const anonymous = await request('/data/location');
  assert.ok([400, 401, 403].includes(anonymous.status));
  console.log('FMD public HTTPS: invitation protection, opaque-data round trip, and account separation passed.');
} finally {
  for (const account of accounts) {
    assert.equal((await request('/account', 'DELETE', undefined, account.token)).status, 200, 'Synthetic account cleanup must succeed');
    assert.equal((await request('/account/' + account.username + '/salt')).status, 404);
  }
  console.log('Synthetic FMD accounts and records deleted; no real device touched.');
}

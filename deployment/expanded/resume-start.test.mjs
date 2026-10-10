import test from 'node:test';
import assert from 'node:assert/strict';
import { validDiscovery, waitForDiscovery } from './resume-start.mjs';
const url = 'https://auth.example.test/application/o/resume/.well-known/openid-configuration';
const document = { issuer: 'https://auth.example.test/application/o/resume/',
  authorization_endpoint: 'https://auth.example.test/application/o/authorize/',
  token_endpoint: 'https://auth.example.test/application/o/token/',
  userinfo_endpoint: 'https://auth.example.test/application/o/userinfo/',
  jwks_uri: 'https://auth.example.test/application/o/resume/jwks/' };
test('startup requires complete discovery from the configured issuer over HTTPS', () => {
  assert.equal(validDiscovery(document, url), true);
  for (const changed of [{ issuer: 'https://other.example.test/' }, { jwks_uri: undefined },
    { token_endpoint: 'http://auth.example.test/token' }, { userinfo_endpoint: 'https://other.example.test/userinfo' }]) {
    assert.equal(validDiscovery({ ...document, ...changed }, url), false);
  }
});
test('transient failure resets readiness; two valid responses are needed before application initialization', async () => {
  const responses = [false, true, false, true, true], delays = [];
  let calls = 0;
  await waitForDiscovery(url, { fetcher: async (_url, options) => {
    assert.equal(options.redirect, 'error');
    return { ok: responses[calls++], json: async () => document };
  }, pause: async ms => { delays.push(ms); }, log: () => {}, maxAttempts: 5 });
  assert.equal(calls, 5); assert.deepEqual(delays, [5000, 1000, 5000, 1000]);
});
test('unavailable identity does not initialize the application with a skipped provider', async () => {
  await assert.rejects(waitForDiscovery(url, { fetcher: async () => { throw Error('unavailable'); },
    pause: async () => {}, log: () => {}, maxAttempts: 2 }), /did not become ready/);
});

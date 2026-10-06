import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const compose = read('../compose.yaml');
const gateway = read('../wiki-gateway.conf');

test('BreezeWiki keeps JSONP, suggestions and outgoing logging disabled', () => {
  for (const name of ['feature_jsonp::enabled', 'feature_search_suggestions', 'log_outgoing']) {
    assert.match(compose, new RegExp(`bw_${name}: "false"`));
  }
  assert.match(compose, /bw_strict_proxy: "true"/);
});

test('browser resources and form submissions cannot fall back to Fandom', () => {
  const policy = gateway.match(/add_header Content-Security-Policy "([^"]+)" always;/)?.[1];
  assert.ok(policy);
  const directives = Object.fromEntries(policy.split(';').map(part => {
    const [name, ...sources] = part.trim().split(/\s+/);
    return [name, sources];
  }));
  for (const name of ['default-src', 'connect-src', 'media-src', 'form-action', 'base-uri']) {
    assert.deepEqual(directives[name], ["'self'"]);
  }
  for (const name of ['img-src', 'font-src']) {
    assert.deepEqual(directives[name], ["'self'", 'data:']);
  }
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.doesNotMatch(policy, /https?:|\*|report-uri|report-to/);
});

test('both article and asset locations strip visitor identity headers', () => {
  const locations = gateway.split(/\n    location /).filter(part => part.includes('proxy_pass'));
  assert.equal(locations.length, 2);
  for (const location of locations) {
    for (const name of ['Cookie', 'Authorization', 'Proxy-Authorization', 'Referer', 'Forwarded', 'X-Forwarded-For', 'X-Real-IP']) {
      assert.ok(location.includes(`proxy_set_header ${name} "";`), name);
    }
    assert.match(location, /proxy_hide_header Set-Cookie;/);
  }
});

test('the application gateway does not log visitor URLs or addresses', () => {
  assert.match(gateway, /access_log off;/);
  assert.match(gateway, /^error_log \/dev\/null;$/m);
  assert.doesNotMatch(gateway, /error_log \/dev\/stderr/);
});

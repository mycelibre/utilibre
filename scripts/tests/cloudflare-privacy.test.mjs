import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSite, readAnalyticsPages, logpullAvailable} from '../check-cloudflare-privacy.mjs';
import {definition, withoutLogging} from '../disable-cloudflare-skip-logging.mjs';

const site = (id, enabled = false, zone = 'utilibre.org') => ({site_tag:id,
  auto_install:true, ruleset:{zone_name:zone, enabled, lite:false}});
const page = (result, total) => ({status:200, data:{success:true, result, result_info:{total_count:total}}});

test('effective enablement is nested, separate from the retained auto-install mode', () => {
  assert.deepEqual(summarizeSite({...site('one'), enabled:true}), {enabled:false, autoInstall:true, lite:false});
  assert.equal(summarizeSite({enabled:false}).enabled, null);
});
test('visits subsequent pages without exposing other names or identifiers', async () => {
  const requests = [];
  const responses = [page([site('private-id-1', true, 'unrelated.example')], 2), page([site('private-id-2')], 2)];
  const result = await readAnalyticsPages(async path => {requests.push(path); return responses.shift();}, 'account', 'utilibre.org');
  assert.equal(result.complete, true);
  assert.equal(result.effectiveState, 'disabled');
  assert.equal(result.returnedSites, 2);
  assert.equal(result.matchingSites.length, 1);
  assert.match(requests[1], /page=2&per_page=100$/);
  assert(!JSON.stringify(result).includes('unrelated.example'));
  assert(!JSON.stringify(result).includes('private-id'));
});
test('an enabled matching site prevents disabled conclusion', async () => {
  const result = await readAnalyticsPages(async () => page([site('a'), site('b', true)], 2), 'a', 'utilibre.org');
  assert.equal(result.effectiveState, 'enabled');
});
test('missing match, field or page coverage is unknown, never disabled', async () => {
  for (const response of [page([], 0), page([site('x', false, 'other.example')], 1),
    page([{site_tag:'x', zone_name:'utilibre.org'}], 1), page([site('a')], 2),
    page([site('a')], undefined), page([{ruleset:{zone_name:'utilibre.org',enabled:false}}], 1)]) {
    const result = await readAnalyticsPages(async () => response, 'a', 'utilibre.org', 2);
    assert.equal(result.effectiveState, 'unknown');
  }
});
test('partial failure preserves uncertainty and does not expose API messages', async () => {
  const responses = [page([site('a')], 2), {status:403,data:{success:false,errors:[{code:10000,message:'sensitive'}]}}];
  const result = await readAnalyticsPages(async () => responses.shift(), 'a', 'utilibre.org');
  assert.equal(result.success, false);
  assert.equal(result.complete, false);
  assert.equal(result.effectiveState, 'unknown');
  assert(!JSON.stringify(result).includes('sensitive'));
});
test('a changing collection count is incomplete', async () => {
  const responses = [page([site('a')], 2), page([site('b')], 3)];
  const result = await readAnalyticsPages(async () => responses.shift(), 'a', 'utilibre.org');
  assert.equal(result.complete, false);
});
test('product availability is not a blanket log-retention conclusion', () => {
  for (const name of ['Free Website','Pro Website','Business']) assert.equal(logpullAvailable(name), false);
  assert.equal(logpullAvailable('Enterprise'), true);
  assert.equal(logpullAvailable('unknown'), null);
});
test('skip correction preserves matching, security behavior and arbitrary fields', () => {
  const rule = {id:'private', version:'7', last_updated:'yesterday', action:'skip', enabled:true,
    expression:'http.host eq "example.invalid"', action_parameters:{ruleset:'current'},
    description:'existing rule', ref:'stable-ref', logging:{enabled:true}};
  const desired = withoutLogging(rule);
  assert.deepEqual({...desired,logging:{enabled:true}}, definition(rule));
  assert.equal(desired.logging.enabled, false);
  assert.equal(rule.logging.enabled, true);
  assert.throws(() => withoutLogging({...rule,action:'block'}));
  assert.throws(() => withoutLogging({...rule,enabled:false}));
});

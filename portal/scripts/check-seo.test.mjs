import assert from 'node:assert/strict';
import test from 'node:test';
import { generalCrawlerRootBlocked } from './check-seo.mjs';

test('named AI restrictions do not become a wildcard ban', () => {
  assert.equal(generalCrawlerRootBlocked('User-agent: *\nAllow: /\nUser-agent: GPTBot\nDisallow: /\nUser-agent: OAI-SearchBot\nDisallow: /\nUser-agent: *\nDisallow: /api/'), false);
});
test('wildcard disallow detects staging protection, including shared groups and comments', () => {
  assert.equal(generalCrawlerRootBlocked('User-agent: bot\nUser-Agent: *\nContent-Signal: search=no\nDisallow: / # staging'), true);
  assert.equal(generalCrawlerRootBlocked('User-agent: *\nDisallow: /*'), true);
});
test('equal root allow wins across repeated wildcard groups', () => {
  assert.equal(generalCrawlerRootBlocked('User-agent: *\nDisallow: /\nUser-agent: *\nAllow: /'), false);
});
test('empty or private-path exclusions are not root bans', () => {
  assert.equal(generalCrawlerRootBlocked('User-agent: *\nDisallow:\nDisallow: /_portal/\nDisallow: /private/'), false);
  assert.equal(generalCrawlerRootBlocked('User-agent: Bingbot\nDisallow: /'), false);
});

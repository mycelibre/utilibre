import assert from 'node:assert/strict';
import test from 'node:test';
import { parseHTML } from 'linkedom';
import { assertPageSemantics, generalCrawlerRootBlocked } from './check-seo.mjs';

const semantics = (head, body = '<h1>A useful task</h1>') =>
  assertPageSemantics(parseHTML(`<!doctype html><html><head>${head}</head><body>${body}</body></html>`).document, 'https://example.test/en/');
const description = '<meta name="description" content="Complete a useful task.">';

test('semantic check accepts informative and deliberately decorative image alternatives', () => {
  assert.deepEqual(semantics(description, '<h1>A useful task</h1><a aria-label="Home"><img src="logo.svg" alt="" aria-hidden="true"></a><img src="example.png" alt="Fictional three-column chart">'),
    { description: 'Complete a useful task.', images: 2 });
});
test('semantic check rejects absent and whitespace-only descriptions', () => {
  assert.throws(() => semantics(''), /exactly one meta description/);
  assert.throws(() => semantics('<meta name="description" content="  ">'), /empty meta description/);
});
test('semantic check catches duplicate descriptions even when casing differs', () => {
  assert.throws(() => semantics(description + '<meta name="Description" content="A second description.">'), /exactly one meta description/);
});
test('semantic check requires the description in the document head', () => {
  assert.throws(() => semantics('', '<h1>Task</h1>' + description), /description must be in the head/);
});
test('semantic check rejects absent, empty and repeated primary headings', () => {
  assert.throws(() => semantics(description, '<h2>A useful task</h2>'), /one initial-HTML H1/);
  assert.throws(() => semantics(description, '<h1> </h1>'), /empty H1/);
  assert.throws(() => semantics(description, '<h1>Task</h1><h1>Another task</h1>'), /one initial-HTML H1/);
});
test('semantic check rejects a missing alt attribute without rejecting empty decorative alt', () => {
  assert.throws(() => semantics(description, '<h1>Task</h1><img src="example.png">'), /image missing alt attribute/);
});

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

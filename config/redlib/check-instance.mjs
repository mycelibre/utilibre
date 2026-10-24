// Explicit bounded smoke check, not a scheduled crawler. No real user data.
// Usage: node check-instance.mjs http://PRIVATE_CANDIDATE:8080 REPORT.json
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { parseHTML } from '../../portal/node_modules/linkedom/esm/index.js';
const origin = new URL(process.argv[2]);
assert.equal(origin.pathname, '/');
assert(!origin.username && !origin.password);
assert(['http:', 'https:'].includes(origin.protocol));
const report = { checkedAt: new Date().toISOString(), requests: 0, results: {}, limitations: ['Bounded public fixture requests, not uptime or load testing'] };
async function get(path) {
  assert(path.startsWith('/') && !path.startsWith('//'));
  assert(++report.requests <= 10, 'Request budget exhausted');
  const response = await fetch(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(35000) });
  const body = await response.text();
  assert(body.length < 8 * 1024 * 1024);
  return { response, body, document: parseHTML(body).document };
}
function comments(page) {
  assert.equal(page.response.status, 200);
  const ids = [...page.document.querySelectorAll('div.comment[id]')].map(e => e.id);
  assert(ids.length > 0, 'No rendered comments');
  assert(!page.body.includes('Failed to parse page JSON data'));
  for (const el of page.document.querySelectorAll('img[src],script[src],link[rel="stylesheet"][href]')) {
    const resource = new URL(el.getAttribute('src') ?? el.getAttribute('href'), origin);
    assert.equal(resource.origin, origin.origin, 'External automatic resource');
  }
  return ids;
}
try {
  const settings = await get('/settings');
  assert.equal(settings.response.status, 200);
  const info = await get('/info.json');
  assert(info.body.includes('e48efd85c4527b211f1219bdcbfda72ada6d4ec6'));
  const redirect = await get('/settings/update?redirect=//example.invalid');
  const location = redirect.response.headers.get('location');
  assert(location && new URL(location, origin).origin === origin.origin);
  report.results.settingsAndRevision = true;
  report.results.externalSettingsRedirectRejected = true;
  const thread = '/r/politics/comments/1xapnji/white_house_blocks_transfer_of_patriot_missiles/';
  const first = await get(thread + '?sort=new');
  const firstIds = comments(first);
  const next = first.document.querySelector('a.deeper_replies[href*="cursor="]')?.getAttribute('href');
  assert(next, 'Missing continuation');
  const nextURL = new URL(next, new URL(thread, origin));
  assert.equal(nextURL.origin, origin.origin);
  assert.equal(nextURL.searchParams.get('sort'), 'new');
  const second = await get(nextURL.pathname + nextURL.search);
  const secondIds = comments(second);
  const uniqueNext = secondIds.filter(id => !firstIds.includes(id));
  assert(uniqueNext.length > 0, 'Pagination did not advance');
  const focused = await get(thread + firstIds[0] + '/?sort=new');
  assert(comments(focused).includes(firstIds[0]), 'Focused comment missing');
  report.results.originalThread = { firstPage: firstIds.length, nextPage: secondIds.length, newIds: uniqueNext.length, sortPreserved: true, focusedComment: true };
  const listing = await get('/r/rust/hot');
  assert.equal(listing.response.status, 200);
  const other = [...listing.document.querySelectorAll('a[href]')].map(e => e.getAttribute('href')).find(h => /^\/r\/rust\/comments\/[a-z0-9]+\//.test(h));
  assert(other, 'No listing entries');
  const otherPage = await get(other);
  report.results.secondThreadComments = comments(otherPage).length;
  const image = otherPage.document.querySelector('img[src^="/preview/"],img[src^="/img/"],img[src^="/thumb/"]')?.getAttribute('src');
  if (image) {
    assert(++report.requests <= 10);
    const res = await fetch(new URL(image, origin), { signal: AbortSignal.timeout(25000) });
    assert.equal(res.status, 200);
    assert(res.headers.get('content-type')?.startsWith('image/'));
    const bytes = (await res.arrayBuffer()).byteLength;
    assert(bytes > 0 && bytes < 8 * 1024 * 1024);
    report.results.proxiedImage = { bytes, type: res.headers.get('content-type') };
  } else report.limitations.push('No image fixture in the selected second thread');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = String(error);
  process.exitCode = 1;
} finally {
  writeFileSync(process.argv[3], JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
}

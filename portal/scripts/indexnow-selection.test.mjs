import test from 'node:test';
import assert from 'node:assert/strict';
import { publicSeoPaths, PUBLIC_ORIGIN, isPublicSeoPath, parseSelection, validatePublicUrl, selectAuditedUrls, assertRemovedResponse } from './indexnow-selection.mjs';
import { runIndexNow } from './submit-indexnow.mjs';
import { practicalGuides, practicalGuidePath } from '../src/pages/practical-guide-data.ts';

const home = `${PUBLIC_ORIGIN}/en/`;
const pdf = `${PUBLIC_ORIGIN}/en/pdf-tools`;
const retired = `${PUBLIC_ORIGIN}/en/support`;
const key = 'a'.repeat(32);
const audited = { origin: PUBLIC_ORIGIN, pages: 2, urls: [home, pdf], robotsSitemapAdvertised: true };

test('only exact reviewed public document paths and the fixed origin are eligible', () => {
  for (const path of ['/en/pdf-tools', '/es/herramientas-pdf', '/en/qr-codes', '/es/codigos-qr']) {
    assert(isPublicSeoPath(path));
    assert.equal(validatePublicUrl(`${PUBLIC_ORIGIN}${path}`), `${PUBLIC_ORIGIN}${path}`);
  }
  for (const url of [
    'https://elsewhere.test/en/', 'https://utilibre.org.evil.test/en/', 'https://rss.utilibre.org/en/',
    'http://utilibre.org/en/', 'https://utilibre.org:443/en/', 'https://utilibre.org:8443/en/',
    'https://user@utilibre.org/en/', 'https://utilibre.org/en/?q=private', 'https://utilibre.org/en/?',
    'https://utilibre.org/en/#', 'https://utilibre.org/api/config', 'https://utilibre.org/en/login',
    'https://utilibre.org/en/pdf-tools/', 'https://utilibre.org/es/pdf-tools',
    'https://utilibre.org/en/%70df-tools', 'https://utilibre.org/a/../en/',
  ]) assert.throws(() => validatePublicUrl(url), undefined, url);
});

test('the complete maintained guide registry and public policies are eligible without admitting application paths', () => {
  assert.equal(new Set(publicSeoPaths).size, publicSeoPaths.length);
  for (const guide of practicalGuides) for (const language of ['en', 'es']) {
    const url = PUBLIC_ORIGIN + practicalGuidePath(guide.id, language);
    assert.equal(validatePublicUrl(url), url, guide.id);
  }
  for (const language of ['en', 'es']) for (const page of ['security', 'your-data']) {
    assert(isPublicSeoPath(`/${language}/${page}`));
  }
  for (const path of ['/en/guides/not-reviewed', '/es/guias/no-revisada', '/en/tools/open-privately', '/api/resumes', '/en/status']) {
    assert(!isPublicSeoPath(path), path);
  }
});

test('selection is explicit, bounded, deduplicated, and unambiguous', () => {
  const selection = parseSelection(['--url', home, '--urls', `${pdf},${home}`, '--removed', retired]);
  assert.deepEqual(selection.changed, [home, pdf]);
  assert.deepEqual(selection.removed, [retired]);
  assert.equal(selection.submit, false);
  assert.throws(() => parseSelection(['--submit']), /requires explicitly/);
  assert.throws(() => parseSelection(['--url']), /requires a value/);
  assert.throws(() => parseSelection(['--all']), /Unknown option/);
  assert.throws(() => parseSelection(['--url', home, '--removed', home]), /both/);
  assert.throws(() => parseSelection(['--url', home, '--submit', '--dry-run']), /cannot be combined/);
  assert.throws(() => parseSelection(['--urls', Array(31).fill(home).join(',')]), /at most/);
});

test('changed pages must be audited and removals must be absent from the sitemap', () => {
  assert.deepEqual(selectAuditedUrls(parseSelection(['--url', pdf, '--removed', retired]), audited), [pdf, retired]);
  assert.throws(() => selectAuditedUrls(parseSelection(['--url', retired]), audited), /sitemap audit/);
  assert.throws(() => selectAuditedUrls(parseSelection(['--removed', home]), audited), /Remove retired/);
  assert.throws(() => selectAuditedUrls(parseSelection(['--url', pdf]), { ...audited, origin: 'https://example.com' }), /must target/);
});

test('a removal needs a real 404/410 without a homepage redirect or successful fallback', () => {
  for (const status of [404, 410]) assertRemovedResponse(retired, { status, url: retired, redirected: false });
  for (const status of [200, 301, 302, 403, 500]) assert.throws(() => assertRemovedResponse(retired, { status, url: retired }), /404 or 410/);
  assert.throws(() => assertRemovedResponse(retired, { status: 404, url: home, redirected: true }), /redirect/);
});

function dependencies(requests) {
  return {
    audit: async (origin) => { assert.equal(origin, PUBLIC_ORIGIN); return audited; },
    read: async () => ({ text: key }), readKey: async () => key, log: () => {},
    request: async (url, options) => {
      requests.push({ url, options });
      return { url, status: options.method === 'POST' ? 202 : 410, redirected: false };
    },
  };
}

test('no selector makes no network requests, and dry-run never posts', async () => {
  const forbidden = async () => { assert.fail('Unexpected request'); };
  await runIndexNow([], { audit: forbidden, read: forbidden, request: forbidden, log: () => {} });
  const requests = [];
  const result = await runIndexNow(['--url', pdf, '--removed', retired], dependencies(requests));
  assert.equal(result.submitted, 0);
  assert.deepEqual(requests.map(({ url }) => url), [retired]);
  assert.equal(requests[0].options.redirect, 'manual');
});

test('explicit submission contains only changed/removed selections, never the entire sitemap', async () => {
  const requests = [];
  const result = await runIndexNow(['--url', pdf, '--removed', retired, '--submit'], dependencies(requests));
  assert.equal(result.submitted, 2);
  const post = requests.find(({ options }) => options.method === 'POST');
  assert.equal(post.url, 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(post.options.body).urlList, [pdf, retired]);
  assert.equal(JSON.parse(post.options.body).host, 'utilibre.org');
});

test('a removal redirected to the homepage stops the whole submission before any POST', async () => {
  const requests = [];
  const deps = dependencies(requests);
  deps.request = async (url, options) => {
    requests.push({ url, options });
    return { status: 302, url, redirected: false };
  };
  await assert.rejects(runIndexNow(['--url', pdf, '--removed', retired, '--submit'], deps), /404 or 410/);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, retired);
  assert.notEqual(requests[0].options.method, 'POST');
});

import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';

// Deliberately not configurable to a public host: this is not a launch check.
const origin = 'http://127.0.0.1:3144';
const output = await mkdtemp('/tmp/utilibre-libremdb-private-');
const browser = await chromium.launch({headless: true});
try {
  for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
    const context = await browser.newContext({viewport: {width, height: 844}});
    const page = await context.newPage();
    const external = new Set(), errors = [], failures = [];
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) external.add(new URL(request.url()).hostname);
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if (response.status() >= 400) failures.push({status: response.status(), path: new URL(response.url()).pathname});});
    const search = await page.goto(`${origin}/find?q=Up`, {waitUntil: 'networkidle', timeout: 45000});
    assert.equal(search.status(), 200);
    assert.ok(await page.locator('a[href="/title/tt1049413"]').count(), 'search finds the expected movie');
    const title = await page.goto(`${origin}/title/tt1049413`, {waitUntil: 'networkidle', timeout: 45000});
    assert.equal(title.status(), 200);
    assert.equal(await page.locator('h1').innerText(), 'Up');
    assert.match(title.headers()['content-security-policy'], /img-src 'self' data:/);
    const loadedImages = await page.evaluate(() => [...document.images].filter(image => image.complete && image.naturalWidth > 0).length);
    assert.ok(loadedImages >= 2, 'poster and another proxied image load');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false);
    assert.deepEqual([...external], []);
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    await page.screenshot({path: `${output}/${name}.png`});
    console.log({name, search: 'pass', movie: 'pass', loadedImages, externalHosts: [...external], overflow});
    await context.close();
  }
  for (const value of ['http://127.0.0.1/private.jpg', 'https://m.media-amazon.com.evil.invalid/image.jpg']) {
    const response = await fetch(`${origin}/api/media_proxy?url=${encodeURIComponent(value)}`, {signal: AbortSignal.timeout(5000)});
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    await response.body?.cancel();
  }
  const missing = await fetch(`${origin}/api/title/invalid`, {signal: AbortSignal.timeout(5000)});
  assert.equal(missing.status, 404);
  const body = await missing.text();
  assert.doesNotMatch(body, /\/app\/|Error:|Axios|stack|api\.graphql/);
  console.log(`Private-only checks passed; screenshots: ${output}`);
} finally {
  await browser.close();
}

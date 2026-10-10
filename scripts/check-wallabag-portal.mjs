// Bounded catalogue/guide release check; no real accounts or reading data.
import assert from 'node:assert/strict';
import {mkdtemp, writeFile} from 'node:fs/promises';
import {chromium} from '../portal/node_modules/playwright-core/index.mjs';
const origin = process.argv[2] || 'https://utilibre.org';
assert(['https://utilibre.org', 'http://127.0.0.1:33089'].includes(origin));
process.umask(0o077);
const output = await mkdtemp('/opt/utilibre/reports/wallabag-portal-');
const browser = await chromium.launch();
const errors = [], outside = new Set();
try {
  for (const [lang, width, slug] of [['en', 1280, 'guides/save-articles'], ['es', 390, 'guias/guardar-articulos']]) {
    const context = await browser.newContext({viewport: {width, height: 900}, serviceWorkers: 'block'});
    context.on('request', r => { if (new URL(r.url()).origin !== origin) outside.add(new URL(r.url()).origin); });
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    const response = await page.goto(`${origin}/${lang}/?view=accounts`);
    assert.equal(response.status(), 200);
    const card = page.locator('[data-catalog-id="wallabag"]'); await card.waitFor();
    assert.equal(await card.locator('a[href="https://wallabag.utilibre.org/"]').count(), 1);
    assert.equal(await card.locator('a[href^="mailto:admin@utilibre.org"]').count(), 1);
    await card.scrollIntoViewIfNeeded(); await page.screenshot({path: `${output}/${lang}-catalogue.png`});
    await page.goto(`${origin}/${lang}/${slug}`);
    await page.getByRole('heading', {level: 1}).waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('html').getAttribute('lang'), lang);
    assert.equal(await page.locator('meta[name="description"]').count(), 1);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://utilibre.org/${lang}/${slug}`);
    assert(await page.locator('a[href="https://wallabag.utilibre.org/"]').count() > 0);
    assert.equal(await page.locator('img:not([alt])').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({path: `${output}/${lang}-guide.png`});
    await page.goto(`${origin}/${lang}/?view=public`);
    assert.equal(await page.locator('[data-catalog-id="wallabag"]').count(), 0);
    const missing = await page.goto(`${origin}/${lang}/wallabag-test-not-a-page`); assert.equal(missing.status(), 404);
    await context.close();
  }
  const context = await browser.newContext({javaScriptEnabled: false});
  const page = await context.newPage(); await page.goto(origin + '/es/guias/guardar-articulos');
  assert.match(await page.locator('main').innerText(), /JSON/); await context.close();
  const sitemap = await (await fetch(origin + '/sitemap.xml')).text();
  assert(sitemap.includes('/en/guides/save-articles') && sitemap.includes('/es/guias/guardar-articulos'));
  const statusResponse = await fetch(origin + '/_portal/status', {signal: AbortSignal.timeout(60000)});
  assert.equal(statusResponse.status, 200);
  const status = await statusResponse.json();
  assert(Array.isArray(status.services), 'Public status response must contain services');
  assert.equal(status.services.find(s => s.id === 'wallabag')?.status, 'operational');
  assert.deepEqual(errors, []); assert.deepEqual([...outside], []);
  const report = {date: new Date().toISOString(), origin, passed: true, browser: 'Linux Chromium; EN 1280px, ES 390px emulation; no-JS guide',
    accountOnly: true, requestLink: true, bilingualGuide: true, metadataAndSitemap: true, status: status.services.find(s => s.id === 'wallabag'),
    statusObservations: status.services.length, errors, outsideRequests: [...outside], screenshots: output};
  await writeFile(output + '/result.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '../../../portal/node_modules/playwright-core/index.mjs';

const origin = process.env.DEGOOG_CHECK_ORIGIN;
if (!origin || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw Error('Use the isolated loopback candidate.');
const report = '/var/lib/utilibre-maintenance/degoog-repair-20261109/browser';
await mkdir(report, { recursive: true });
const browser = await chromium.launch({ headless: true });
const output = [];
try {
  for (const [name, width, locale, query] of [
    ['desktop', 1280, 'en', 'how to boil eggs'],
    ['mobile-empty', 390, 'es-GT', 'fixture-empty'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale });
    const page = await context.newPage(), external = new Set(), errors = [], failed = [];
    context.on('request', req => { if (new URL(req.url()).origin !== origin) external.add(new URL(req.url()).origin); });
    page.on('pageerror', err => errors.push(err.message));
    page.on('response', res => { const path = new URL(res.url()).pathname; if (res.status() >= 400 && !(res.status() === 404 && path === '/api/proxy/favicon')) failed.push([path, res.status()]); });
    assert.equal((await page.goto(origin, { waitUntil: 'networkidle' })).status(), 200);
    assert.ok((await page.locator('script[src*="/public/app.js"]').getAttribute('src')).includes('utilibre.search.20261109'));
    if (name === 'desktop') {
      // Simulate preferences saved before Brave was installed. Preserve an
      // intentionally disabled existing engine while discovering the new one.
      await page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('degoog', 2);
        request.onsuccess = () => { const db = request.result, tx = db.transaction('settings', 'readwrite'); tx.objectStore('settings').put({ 'searx-mwmbl-engine': false, 'searx-google_cse-engine': true, 'searx-openlibrary-engine': true, 'searx-hackernews-engine': true }, 'engines'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
        request.onerror = () => reject(request.error);
      }));
      await page.reload({ waitUntil: 'networkidle' });
    }
    await page.locator('#search-input').fill(query);
    await page.locator('#btn-search').click();
    await page.waitForFunction(() => document.querySelector('#results-list')?.textContent?.includes('providers') || document.querySelector('#results-list')?.textContent?.includes('proveedores'), {}, { timeout: 15000 });
    const count = await page.locator('#results-list a.result-title').count();
    const body = await page.locator('body').innerText();
    if (name === 'desktop') {
      assert.ok(count >= 10);
      assert.ok(body.includes('Brave'));
      assert.ok(body.includes('Some providers are unavailable: Google Cse'));
      assert.ok(body.includes('temporarily rate limited'));
      assert.ok(body.includes('other selected providers'));
      const saved = await page.evaluate(() => new Promise(resolve => { const r = indexedDB.open('degoog', 2); r.onsuccess = () => { const db = r.result, q = db.transaction('settings').objectStore('settings').get('engines'); q.onsuccess = () => { resolve(q.result); db.close(); }; }; }));
      assert.equal(saved['searx-mwmbl-engine'], false);
    } else {
      assert.equal(count, 0);
      assert.ok(body.includes('proveedores no están disponibles'));
      assert.ok(body.includes('Probá más tarde'));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual([...external], []); assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    await page.screenshot({ path: `${report}/${name}.png` });
    output.push({ name, count, external: [...external], errors, failed });
    await context.close();
  }
  const nojs = await browser.newContext({ javaScriptEnabled: false, locale: 'en' });
  const page = await nojs.newPage();
  assert.equal((await page.goto(origin + '/nojs/search?q=how%20to%20boil%20eggs&lang=en', { waitUntil: 'networkidle' })).status(), 200);
  assert.ok((await page.locator('body').innerText()).includes('temporarily rate limited'));
  assert.ok((await page.locator('body').innerText()).includes('Brave'));
  await nojs.close();
  await writeFile(`${report}/result.json`, JSON.stringify({ passed: true, output }, null, 2));
  console.log(JSON.stringify(output));
} finally { await browser.close(); }

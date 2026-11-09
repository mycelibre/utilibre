// Read-only public homepage. Only two candidate JavaScript responses are
// substituted in this browser; no source is deployed and no pad is created.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const [staging, out] = process.argv.slice(2);
assert(staging?.startsWith('/tmp/'));
assert(out?.startsWith('/var/lib/utilibre-maintenance/'));
const pages = await readFile(`${staging}/cryptpad/pages.js`, 'utf8');
const menu = await readFile(`${staging}/cryptpad/common-ui-elements.js`, 'utf8');
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({viewport:{width, height:900}, locale:'es-GT', serviceWorkers:'block'});
    const replacements = new Set(), outside = new Set(), blockedWrites = [], errors = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (!['pad.utilibre.org', 'sandbox-pad.utilibre.org'].includes(url.hostname)) {
        outside.add(url.origin); return route.abort();
      }
      if (!['GET', 'HEAD'].includes(request.method())) {
        blockedWrites.push(request.method() + ' ' + url.pathname); return route.abort();
      }
      if (url.pathname === '/customize/pages.js') {
        replacements.add('pages'); return route.fulfill({status:200, contentType:'application/javascript', body:pages});
      }
      if (url.pathname === '/common/common-ui-elements.js') {
        replacements.add('menu'); return route.fulfill({status:200, contentType:'application/javascript', body:menu});
      }
      return route.continue();
    });
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://pad.utilibre.org/');
    await page.locator('#utilibre-abuse-report a[lang=es]').waitFor();
    assert.equal(await page.locator('#utilibre-abuse-report a').count(), 2);
    await page.screenshot({path:`${out}/cryptpad-home-${width}.png`, fullPage:true});
    // Call the native About renderer with only the public origin. No document
    // metadata, Common API operations or account content are supplied/read.
    await page.evaluate(() => new Promise((resolve, reject) => {
      window.require(['/common/common-ui-elements.js'], module => {
        try { module.displayInfoMenu({}, {getPrivateData:() => ({origin:location.origin})}); resolve(true); }
        catch (error) { reject(error); }
      }, reject);
    }));
    const about = page.locator('.cp-info-menu-container');
    await about.waitFor();
    const links = about.locator('a[href="https://utilibre.org/en/abuse"], a[href="https://utilibre.org/es/denunciar-abuso"]');
    assert.equal(await links.count(), 2);
    assert.equal(await links.first().getAttribute('referrerpolicy'), 'no-referrer');
    await page.screenshot({path:`${out}/cryptpad-about-${width}.png`, fullPage:true});
    assert.equal(replacements.size, 2);
    assert.equal(outside.size, 0);
    assert.deepEqual(blockedWrites, []);
    assert.deepEqual(errors, []);
    results.push({width, replacedAssets:[...replacements], footerReportLinks:2, aboutReportLinks:2, externalRequests:[], writes:[], browserErrors:[]});
    await context.close();
  }
  await writeFile(`${out}/cryptpad-preview.json`, JSON.stringify({mode:'Simulated candidate JS in read-only public homepage; not deployed', results}, null, 2));
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}

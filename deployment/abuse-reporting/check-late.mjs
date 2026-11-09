// Fictional, loopback-only native footer fixtures. Never open a submitted form
// or connect Rustpad to a shared document/backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const out = '/var/lib/utilibre-maintenance/security-20261109/abuse-reporting/late';
const browser = await chromium.launch();
const results = [];
try {
  for (const surface of ['general-en','general-es','minimal-en','minimal-es','public-en','public-es','rustpad/']) {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, serviceWorkers:'block'});
    // The Rustpad fixture tests the actual built frontend without a backend.
    await context.routeWebSocket('**', socket => socket.close());
    const page = await context.newPage(), external = [], errors = [], writes = [];
    await context.route('**/*', route => {
      if (!['GET','HEAD'].includes(route.request().method())) {
        writes.push(route.request().method()); return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    page.on('request', request => {
      const url = new URL(request.url());
      if (['http:','https:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:43916') external.push(url.origin);
    });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:43916/' + surface + (surface === 'rustpad/' ? '' : '.html'));
    for (const url of ['https://utilibre.org/en/abuse','https://utilibre.org/es/denunciar-abuso']) {
      const link = page.locator(`a[href="${url}"]`); await link.waitFor();
      assert.equal(await link.getAttribute('referrerpolicy'), 'no-referrer');
    }
    assert.equal(await page.locator('a[href="https://utilibre.org/es/denunciar-abuso"]').innerText(), 'Denunciá abusos');
    if (surface === 'rustpad/') {
      for (const href of ['https://utilibre.org/en/','https://utilibre.org/es/','https://utilibre.org/en/guides/shared-code-pad','https://utilibre.org/es/guias/editor-codigo-compartido']) {
        assert.equal(await page.locator(`a[href="${href}"]`).count(), 1);
      }
      await page.locator('.monaco-editor').first().waitFor();
    } else if (!surface.startsWith('minimal')) {
      assert.equal(await page.locator('a[href="/utilibre-source/liberaforms-utilibre.tar.gz"]').count(), 1);
      assert((await page.locator('body').innerText()).includes('AGPLv3'));
    }
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000}); await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, surface);
      const link = await page.locator('a[href="https://utilibre.org/es/denunciar-abuso"]').boundingBox();
      assert(link && link.x >= 0 && link.x + link.width <= width && link.y + link.height <= 1000, surface);
      await page.screenshot({path:`${out}/${surface.replace('/','')}-${width}.png`,fullPage:true});
    }
    assert.deepEqual(external, []); assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    results.push({surface,widths:[1440,390],reportLinks:2,externalRequests:external,browserErrors:errors,writes});
    await context.close();
  }
  fs.writeFileSync(out + '/browser.json',JSON.stringify({passed:true,syntheticFixtures:true,results},null,2)+'\n');
  console.log('Six native Forms footer states and the built Rustpad frontend passed.');
} finally { await browser.close(); }

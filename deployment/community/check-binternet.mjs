// Protected-backend functional check; this does not establish public TLS.
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = process.env.BINTERNET_CHECK_ORIGIN || 'http://10.10.1.43:3150';
const screenshots = await mkdtemp('/tmp/utilibre-binternet-check-');
const browser = await chromium.launch({ headless: true });
const external = new Set();
const errors = [];
try {
  for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on('request', request => {
      if (new URL(request.url()).origin !== origin) external.add(new URL(request.url()).origin);
    });
    page.on('pageerror', error => errors.push(error.message));
    const home = await page.goto(origin);
    assert.equal(home.status(), 200);
    assert.ok(!(await page.content()).includes('<?php'));
    await page.screenshot({ path: `${screenshots}/${name}-home.png` });
    await page.locator('[name=q]').fill('Guatemala');
    await page.locator('[name=q]').press('Enter');
    await page.waitForURL(/search.php/);
    await page.locator('.img-result').first().waitFor();
    await page.waitForFunction(() => [...document.querySelectorAll('.img-result img')].some(image => image.complete && image.naturalWidth > 0));
    await page.waitForFunction(() => [...document.querySelectorAll('.img-result img')].filter(image => {
      const box = image.getBoundingClientRect();
      return box.top < innerHeight && box.bottom > 0;
    }).every(image => image.complete && image.naturalWidth > 0), null, { timeout: 60000 });
    assert.ok(await page.locator('.img-result').count() > 0);
    await page.screenshot({ path: `${screenshots}/${name}-results.png` });
    if (name === 'mobile') {
      await page.getByRole('link', { name: 'Next page', exact: true }).click();
      await page.waitForURL(/bookmark=/);
      await page.locator('.img-result').first().waitFor();
      assert.ok(await page.locator('.img-result').count() > 0);
    }
    await context.close();
  }
  const api = await browser.newContext();
  for (const path of ['/api.php', '/misc/utilibre-http.php', '/.git/config', '/tests/utilibre-http.php', '/Dockerfile.utilibre']) {
    assert.equal((await api.request.get(origin + path)).status(), 404, path);
  }
  for (const url of ['http://127.0.0.1/', 'https://10.10.1.3/', 'https://i.pinimg.com.evil.test/a', 'https://i.pinimg.com@127.0.0.1/a', 'file:///etc/passwd']) {
    assert.equal((await api.request.get(`${origin}/image_proxy.php?url=${encodeURIComponent(url)}`)).status(), 400);
  }
  assert.equal((await api.request.post(origin + '/search.php', { data: 'q=test' })).status(), 405);
  assert.equal(external.size, 0, `Unexpected browser recipients: ${[...external].join(', ')}`);
  assert.equal(errors.length, 0, errors.join('; '));
  console.log(`Binternet: desktop/mobile search, loaded images, pagination, proxy denials and same-origin browser requests passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}

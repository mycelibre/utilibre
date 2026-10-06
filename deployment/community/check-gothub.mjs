// Exercise public content and the Accept-Encoding regression on read-only roots.
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const origin = process.env.GOTHUB_CHECK_ORIGIN || 'https://gothub.utilibre.org';
for (const encoding of ['gzip', 'identity']) {
  const response = await fetch(`${origin}/css/global.css?v=24bedc8-p2`, {
    headers: { 'Accept-Encoding': encoding }, signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, 200, `${encoding} stylesheet`);
  assert.match(response.headers.get('content-type'), /^text\/css/);
  assert.match(await response.text(), /font-family/);
}
const screenshots = await mkdtemp('/tmp/utilibre-gothub-check-');
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of [['desktop', { width: 1280, height: 800 }], ['mobile', { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const failedAssets = [];
    page.on('response', response => {
      if (/\/css\/|\/logo.svg|\/favicon.ico/.test(response.url()) && !response.ok()) failedAssets.push(response.url());
    });
    assert.equal((await page.goto(origin)).status(), 200);
    await page.locator('link[rel=stylesheet]').evaluate(element => {
      if (!element.sheet || !element.sheet.cssRules.length) throw new Error('Stylesheet was not applied');
    });
    await page.screenshot({ path: `${screenshots}/${name}-home.png` });
    assert.equal((await page.goto(`${origin}/mycelibre/utilibre`)).status(), 200);
    assert.match(await page.locator('body').innerText(), /utilibre/i);
    await page.screenshot({ path: `${screenshots}/${name}-repository.png` });
    assert.equal(failedAssets.length, 0, failedAssets.join(', '));
    await context.close();
  }
  const file = await fetch(`${origin}/mycelibre/utilibre/blob/main/README.md`, { signal: AbortSignal.timeout(30000) });
  assert.equal(file.status, 200);
  assert.match(await file.text(), /Utilibre/);
  console.log(`GotHub: gzip/identity CSS, styled desktop/mobile pages, repository and file passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
}

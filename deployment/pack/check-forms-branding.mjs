// Public, anonymous smoke check: no form submission, account or private data.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(new URL('../../portal/package.json', import.meta.url));
const {chromium} = require('@playwright/test');
const origin = 'https://forms.utilibre.org';
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  for (const path of ['/logo.png', '/favicon.ico']) {
    const response = await context.request.get(origin + path);
    assert.equal(response.status(), 200, path);
    assert.match(response.headers()['content-type'], /^image\//, path);
    assert.ok((await response.body()).byteLength > 0, path);
  }
  for (const width of [1280, 390]) {
    await page.setViewportSize({width, height: 800});
    const response = await page.goto(origin, {waitUntil: 'networkidle'});
    assert.equal(response.status(), 200);
    const images = await page.locator('img').evaluateAll(nodes => nodes.map(img => ({
      path: new URL(img.src).pathname, loaded: img.complete && img.naturalWidth > 0,
    })));
    assert.ok(images.some(img => img.path === '/logo.png'));
    assert.ok(images.every(img => img.loaded), JSON.stringify(images));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    console.log(`Homepage ${width}px: logo decoded; no horizontal overflow.`);
  }
  const login = await page.goto(`${origin}/user/login`, {waitUntil: 'networkidle'});
  assert.equal(login.status(), 200);
  assert.ok(await page.locator('#username').isVisible());
  assert.deepEqual(errors, []);
  console.log('Public logo, favicon and sign-in: passed; no HTTP errors. No accounts or answers changed.');
} finally {
  await browser.close();
}

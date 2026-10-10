// Public operator-copy checks; only the new random shortener fixture is changed.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const directory = '/opt/utilibre/reports/native-copy-20261009';
const browser = await chromium.launch();
const results = [];
try {
  for (const [url, text] of [
    ['https://lyrics.utilibre.org/', 'Buscá letras de canciones sin una cuenta.'],
    ['https://translate.utilibre.org/', 'No enviés contraseñas ni información personal o confidencial.'],
    ['https://links.utilibre.org/', 'Conservá la URL original.'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const outside = new Set();
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(url).origin) outside.add(new URL(request.url()).origin);
    });
    assert.equal((await page.goto(url)).status(), 200);
    await page.getByText(text, { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual([...outside], []);
    results.push({ host: new URL(url).hostname, spanishNotice: true, mobileOverflow: false, externalRequests: 0 });
    await context.close();
  }

  const pairdrop = await browser.newContext();
  const drop = await pairdrop.newPage();
  const title = 'Más herramientas de Utilibre / More tools from Utilibre';
  const config = await (await drop.request.get('https://drop.utilibre.org/config')).json();
  assert.equal(config.buttons.custom_button.title, title);
  await drop.goto('https://drop.utilibre.org/');
  const link = drop.locator(`[title="${title}"]`);
  await link.waitFor();
  assert.equal(await link.getAttribute('href'), 'https://utilibre.org/');
  await pairdrop.close();

  const context = await browser.newContext();
  const page = await context.newPage();
  const base = 'https://links.utilibre.org';
  const slug = 'utilibre-qa-copy-' + randomBytes(8).toString('hex');
  const destination = 'https://utilibre.org/en/?fictional=native-copy';
  await writeFile(`${directory}/chhoto-copy-fixture.json`, JSON.stringify({ slug, destination }), { mode: 0o600 });
  let created = false;
  try {
    await page.goto(base);
    await page.locator('#longUrl').fill(destination);
    await page.locator('#shortUrl').fill(slug);
    await page.getByText('More options', { exact: true }).click();
    await page.locator('#expiryDelay').selectOption('600');
    const request = page.waitForResponse(response => response.url().endsWith('/api/new'));
    await page.getByRole('button', { name: 'Shorten!', exact: true }).click();
    assert.equal((await request).status(), 201);
    created = true;
    const response = await context.request.get(`${base}/${slug}`, { maxRedirects: 0 });
    assert.equal(response.status(), 307);
    assert.equal(response.headers().location, destination);
    assert.equal((await context.request.delete(`${base}/api/del/${slug}`)).status(), 401);
  } finally {
    if (created) {
      const { password } = JSON.parse(await readFile('/opt/utilibre/chhoto-private/operator.json', 'utf8'));
      assert.equal((await context.request.post(`${base}/api/login`, { data: { password, remember: false } })).status(), 200);
      assert.equal((await context.request.delete(`${base}/api/del/${slug}`)).status(), 200);
      assert.equal((await context.request.get(`${base}/${slug}`, { maxRedirects: 0 })).status(), 404);
    }
    await context.close();
  }
  const report = { result: 'passed', at: new Date().toISOString(), results, pairdropNativeLabel: true,
    fictionalShortenerCreateRedirectDelete: true, realRecordsInspected: false };
  await writeFile(`${directory}/native-copy-public.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}

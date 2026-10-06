// Synthetic browser workflow. Backend mode preserves HTTPS browser semantics
// through a temporary loopback TLS proxy; it does NOT verify public TLS.
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { request as upstreamRequest } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'https://pollaris.utilibre.org';
const local = process.argv.includes('--backend');
let proxy;
let certificateDirectory;
if (local) {
  certificateDirectory = await mkdtemp('/tmp/utilibre-pollaris-tls-');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=pollaris.utilibre.org', '-addext', 'subjectAltName=DNS:pollaris.utilibre.org',
    '-keyout', `${certificateDirectory}/key.pem`, '-out', `${certificateDirectory}/cert.pem`], { stdio: 'ignore' });
  proxy = createServer({ key: await readFile(`${certificateDirectory}/key.pem`), cert: await readFile(`${certificateDirectory}/cert.pem`) }, (req, res) => {
    const forwarded = upstreamRequest({ host: '10.10.1.43', port: 3149, path: req.url, method: req.method,
      headers: { ...req.headers, host: 'pollaris.utilibre.org' }, timeout: 35000 }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers);
      upstream.pipe(res);
    });
    forwarded.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(forwarded);
  });
  await new Promise((resolve, reject) => {
    proxy.once('error', reject);
    proxy.listen(443, '127.0.0.1', resolve);
  });
}
const browser = await chromium.launch({ headless: true,
  args: local ? ['--host-resolver-rules=MAP pollaris.utilibre.org 127.0.0.1', '--no-proxy-server'] : [],
});
const title = `Utilibre synthetic ${Date.now()}`;
const errors = [];
async function context(locale = 'en-GB') {
  return browser.newContext({ locale, ignoreHTTPSErrors: local });
}
const owner = await context();
const page = await owner.newPage();
page.on('pageerror', error => errors.push(error.message));
let adminBase;
let publicUrl;
try {
  await page.goto(`${origin}/polls/new?type=classic`);
  await page.locator('[name="poll[title]"]').fill(title);
  await page.locator('[name="poll[authorName]"]').fill('Utilibre synthetic organizer');
  await page.locator('button[type=submit]').click();
  await page.waitForURL(/\/proposals/);
  adminBase = page.url().split('/proposals')[0];
  const choices = page.locator('input[name^="poll_proposals[proposals]"]');
  await choices.nth(0).fill('Option A');
  await choices.nth(1).fill('Option B');
  await page.locator('button[value=next]').click();
  await page.waitForURL(/\/summary/);
  await page.locator('button[value=next]').click();
  await page.waitForURL(/\/complete/);
  publicUrl = await page.locator('#poll-public-link').inputValue();
  assert.ok(publicUrl.startsWith(`${origin}/polls/`));
  const guest = await context();
  const voter = await guest.newPage();
  await voter.goto(publicUrl);
  await voter.locator('[name="vote[authorName]"]').fill('Utilibre synthetic guest');
  const inputs = await voter.locator('[name^="vote[answers]"]').evaluateAll(es => es.map(e => ({ name: e.name, type: e.type, value: e.value })));
  for (const name of new Set(inputs.map(input => input.name))) {
    const yes = inputs.find(input => input.name === name && input.value === 'yes');
    assert.ok(yes, 'The native vote form must expose a Yes option');
    const input = voter.locator(`input[name="${name}"][value="yes"]`);
    const id = await input.getAttribute('id');
    await voter.locator(`label[for="${id}"]`).click();
    assert.equal(await input.isChecked(), true);
  }
  await voter.locator('[name="vote[submit]"]').click();
  await voter.getByText('Utilibre synthetic guest', { exact: true }).first().waitFor({ state: 'attached' });
  const csv = await voter.evaluate(async url => { const r = await fetch(`${url}.csv`); return { status: r.status, text: await r.text() }; }, publicUrl);
  assert.equal(csv.status, 200);
  assert.match(csv.text, /Utilibre synthetic guest/);
  const wrongAdmin = adminBase.replace(/\/[^/]+$/, '/invalid-token');
  assert.equal((await voter.goto(`${wrongAdmin}/admin`)).status(), 404);
  assert.equal((await voter.goto(`${origin}/admin`)).status(), 404);
  assert.equal((await voter.goto(`${origin}/login`)).status(), 404);
  assert.equal((await voter.goto(`${origin}/.env`)).status(), 404);
  const spanish = await context('en-GB');
  const translated = await spanish.newPage();
  await translated.goto(`${origin}/utilibre-language.html?lang=es`);
  await translated.waitForURL(`${origin}/`);
  assert.equal(await translated.locator('html').getAttribute('lang'), 'es');
  assert.equal(errors.length, 0, errors.join('; '));
  console.log(`Pollaris ${local ? 'backend' : 'public HTTPS'}: creation, anonymous voting, CSV export, admin denial and Spanish handoff passed.`);
} catch (error) {
  console.error('Pollaris workflow failed:', error.message);
  throw error;
} finally {
  try { if (adminBase) {
    await page.goto(`${adminBase}/admin`);
    await page.locator('[data-modal-opener-selector-value$="/deletion"]').click();
    await page.locator('[name="poll_deletion[submit]"]').click();
    await page.waitForURL(`${origin}/`);
    if (publicUrl) assert.equal((await page.goto(publicUrl)).status(), 404);
    console.log('Synthetic poll and responses deleted through the native application.');
  } } finally {
    await browser.close();
    if (proxy) { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
    if (certificateDirectory) await rm(certificateDirectory, { recursive: true });
  }
}

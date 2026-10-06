// --backend uses temporary loopback TLS only; it does not certify public HTTPS.
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { request as upstreamRequest } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'https://translate.utilibre.org';
const local = process.argv.includes('--backend');
const screenshots = await mkdtemp('/tmp/utilibre-translite-check-');
let proxy;
let certificateDirectory;
if (local) {
  certificateDirectory = await mkdtemp('/tmp/utilibre-translite-tls-');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=translate.utilibre.org', '-addext', 'subjectAltName=DNS:translate.utilibre.org',
    '-keyout', `${certificateDirectory}/key.pem`, '-out', `${certificateDirectory}/cert.pem`], { stdio: 'ignore' });
  proxy = createServer({ key: await readFile(`${certificateDirectory}/key.pem`), cert: await readFile(`${certificateDirectory}/cert.pem`) }, (req, res) => {
    const forwarded = upstreamRequest({ host: '10.10.1.43', port: 3152, path: req.url, method: req.method,
      headers: { ...req.headers, host: 'translate.utilibre.org' }, timeout: 50000 }, upstream => {
      res.writeHead(upstream.statusCode, upstream.headers); upstream.pipe(res);
    });
    forwarded.on('error', () => { res.writeHead(502); res.end(); });
    req.pipe(forwarded);
  });
  await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(443, '127.0.0.1', resolve); });
}
const browser = await chromium.launch({ headless: true,
  args: local ? ['--host-resolver-rules=MAP translate.utilibre.org 127.0.0.1', '--no-proxy-server'] : [],
});
const external = new Set();
try {
  for (const [name, viewport, locale] of [['desktop', { width: 1280, height: 800 }, 'en-GB'], ['mobile', { width: 390, height: 844 }, 'es-GT']]) {
    const context = await browser.newContext({ viewport, locale, ignoreHTTPSErrors: local });
    const page = await context.newPage();
    page.on('request', request => { if (new URL(request.url()).origin !== origin) external.add(new URL(request.url()).origin); });
    if (process.env.TRANSLITE_DEBUG === '1') page.on('request', async request => {
      if (request.method() === 'POST') {
        const headers = await request.allHeaders();
        console.log({ origin: headers.origin, fetchSite: headers['sec-fetch-site'] });
      }
    });
    const response = await page.goto(`${origin}/?tl=${name === 'mobile' ? 'es' : 'en'}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['cache-control'], /no-store/);
    assert.equal(await page.locator('#form').getAttribute('method'), 'POST');
    assert.equal(await page.locator('script[src^="/static/"]').count(), 0, 'Application JavaScript remains opt-in');
    if (local) assert.equal(await page.locator('script').count(), 0);
    await page.locator('#slSelect').selectOption(name === 'mobile' ? 'en' : 'es');
    await page.locator('#tlSelect').selectOption(name === 'mobile' ? 'es' : 'en');
    await page.locator('#slTextarea').fill(name === 'mobile' ? 'Good afternoon. This is a public test.' : 'Buenas tardes. Esta es una prueba pública.');
    const [submitted] = await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
      page.locator('#form > button[type=submit]').click(),
    ]);
    assert.equal(submitted.status(), 200, `Translation response: ${(await page.locator('body').innerText()).slice(0, 200)}`);
    const translation = await page.locator('textarea[readonly]').first().inputValue();
    assert.match(translation, name === 'mobile' ? /Buenas tardes/i : /Good afternoon/i);
    assert.ok(!page.url().includes('text='));
    assert.equal(await page.locator('audio').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'No horizontal overflow');
    assert.ok((await context.cookies()).filter(c => c.name === 'PHPSESSID').every(c => c.secure && c.httpOnly && c.sameSite === 'Lax'));
    await page.screenshot({ path: `${screenshots}/${name}-translation.png` });
    if (name === 'desktop') {
      const results = await page.evaluate(async () => {
        const output = [];
        for (const engine of ['deepl', 'yandex', 'ddg']) {
          const response = await fetch('/api/translate', { method: 'POST', body: new URLSearchParams({ engine, sl: 'es', tl: 'en', text: 'Buenas tardes. Esta es una prueba pública.' }) });
          output.push({ engine, status: response.status, text: await response.text() });
        }
        return output;
      });
      for (const result of results) {
        assert.equal(result.status, 200, result.engine);
        assert.match(result.text, /Good afternoon/i);
      }
      // Real native engine switching carries text through a short RAM session.
      await page.getByRole('button', { name: 'DeepL', exact: true }).click();
      await page.waitForLoadState('domcontentloaded');
      assert.equal(await page.locator('input[name=engine]').inputValue(), 'deepl');
      assert.match(await page.locator('#slTextarea').inputValue(), /Buenas tardes/);
    }
    if (name === 'mobile') {
      const checks = await page.evaluate(async () => {
        const results = [];
        for (const path of ['/.git/config', '/config/config.php', '/api/tts']) results.push([path, (await fetch(path)).status]);
        results.push(['GET text', (await fetch('/?text=synthetic')).status]);
        results.push(['array', (await fetch('/api/translate', { method: 'POST', body: new URLSearchParams({ 'text[]': 'x', sl: 'es', tl: 'en' }) })).status]);
        results.push(['length', (await fetch('/api/translate', { method: 'POST', body: new URLSearchParams({ text: 'x'.repeat(2001), sl: 'es', tl: 'en' }) })).status]);
        return results;
      });
      assert.deepEqual(checks.map(item => item[1]), [404, 404, 404, 405, 400, 413]);
    }
    await context.close();
  }
  assert.equal(external.size, 0, `Unexpected browser recipients: ${[...external].join(', ')}`);
  console.log(`TransLite ${local ? 'protected backend' : 'public HTTPS'}: EN/ES translations, desktop/mobile, POST/no-store, secure cookies, no browser third parties, input/path denials passed. Screenshots: ${screenshots}`);
} finally {
  await browser.close();
  if (proxy) { proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  if (certificateDirectory) await rm(certificateDirectory, { recursive: true });
}

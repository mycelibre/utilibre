// Bounded real-HTTPS journey using disposable native accounts, never the owner.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, mkdtemp} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const origin = 'https://wallabag.utilibre.org';
const container = 'utilibre-wallabag-app-1';
const output = await mkdtemp('/opt/utilibre/reports/wallabag-public-');
const fixture = (await readFile(new URL('./smoke-fixture.php', import.meta.url), 'utf8')).replace(/^<\?php/, '');
const stamp = Math.floor(Date.now() / 1000);
const data = {action: 'seed', a: `qa-wallabag-${stamp}-a`, b: `qa-wallabag-${stamp}-b`, password: randomBytes(30).toString('base64url')};
const seed = action => execFileSync('docker', ['exec', '-i', container, 'php', '-r', fixture], {
  input: JSON.stringify({...data, action}), encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
});
await writeFile(output + '/fixture.json', JSON.stringify(data), {mode: 0o600});
Object.assign(data, JSON.parse(seed('seed')));
assert(data.syntheticOnly && Number.isSafeInteger(data.entryId));
const browser = await chromium.launch();
const outside = new Set(), errors = [], failedAssets = [];
let passed = false;
async function context(width) {
  const ctx = await browser.newContext({viewport: {width, height: 900}, serviceWorkers: 'block'});
  ctx.setDefaultTimeout(20000); ctx.setDefaultNavigationTimeout(30000);
  ctx.on('response', r => {
    if (new URL(r.url()).origin !== origin) outside.add(new URL(r.url()).origin);
    if (r.status() >= 400 && /\.(js|css|woff2?)(\?|$)/.test(r.url())) failedAssets.push(new URL(r.url()).pathname);
  });
  ctx.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  return ctx;
}
async function login(ctx, username) {
  const page = await ctx.newPage();
  await page.goto(origin + '/login');
  await page.locator('[name="_username"]').fill(username);
  await page.locator('[name="_password"]').fill(data.password);
  await Promise.all([page.waitForURL(u => u.pathname !== '/login'), page.locator('button[name="send"]').click()]);
  return page;
}
try {
  const a = await context(1280), page = await login(a, data.a);
  await page.locator('#_auth_code').waitFor();
  assert.equal(await page.locator('[name="_csrf_token"]').count(), 1);
  const code = execFileSync('docker', ['exec', container, 'php', '-r', 'require "vendor/autoload.php"; echo OTPHP\\TOTP::create("JBSWY3DPEHPK3PXP")->now();'], {encoding: 'utf8'});
  await page.locator('#_auth_code').fill(code);
  await Promise.all([page.waitForURL(u => !u.pathname.startsWith('/2fa')), page.locator('button[name="send"]').click()]);
  const response = await page.goto(`${origin}/view/${data.entryId}`);
  assert.equal(response.status(), 200);
  assert(response.headers()['referrer-policy'].split(/[\n,]+/).every(value => value.trim() === 'no-referrer'));
  assert.match(response.headers()['cache-control'], /no-store/);
  assert.match(response.headers()['x-robots-tag'], /noindex/);
  assert.match(await page.locator('#article').innerText(), /Fictional local article/);
  assert.equal(await page.locator('#article img').evaluate(e => getComputedStyle(e).display), 'none');
  await page.screenshot({path: output + '/article-desktop.png'});
  await page.setViewportSize({width: 390, height: 844}); await page.reload();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({path: output + '/article-mobile.png'});
  for (const format of ['json', 'txt', 'pdf', 'epub']) {
    const r = await a.request.get(`${origin}/export/${data.entryId}.${format}`);
    assert.equal(r.status(), 200, format);
    const bytes = await r.body(); assert(bytes.length > 20, format);
    await writeFile(`${output}/fictional.${format}`, bytes);
    if (format === 'pdf') {
      assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      // Reuse the deployed PDF.js viewer; all requests in this isolated context
      // are fulfilled from local assets, never sent to the fictional host.
      const pdfContext = await browser.newContext({serviceWorkers: 'block'});
      await pdfContext.route('**/*', async route => {
        const name = new URL(route.request().url()).pathname.slice(1);
        if (['pdf.mjs', 'pdf.worker.mjs'].includes(name)) return route.fulfill({contentType: 'text/javascript', body: await readFile(`/opt/utilibre/pack-static/bentopdf-2.8.8-p4/pdfjs-viewer/${name}`)});
        if (!name) return route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Synthetic PDF check</title>'});
        return route.abort();
      });
      const pdfPage = await pdfContext.newPage(); await pdfPage.goto('https://pdf-check.example.invalid/');
      const text = await pdfPage.evaluate(async data => {
        const pdfjs = await import('/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs';
        const pdf = await pdfjs.getDocument({data: new Uint8Array(data), isEvalSupported: false}).promise;
        let text = '';
        for (let n = 1; n <= pdf.numPages; n++) text += (await (await pdf.getPage(n)).getTextContent()).items.map(item => item.str).join(' ');
        await pdf.destroy(); return text;
      }, [...bytes]);
      assert.match(text, /Fictional local article/); await pdfContext.close();
    }
    if (format === 'epub') assert.match(execFileSync('unzip', ['-p', `${output}/fictional.epub`], {encoding: 'utf8', maxBuffer: 2 * 1024 ** 2}), /Fictional local article/);
    if (format === 'json' || format === 'txt') assert.match(bytes.toString(), /Fictional local article/);
  }
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(origin + '/new'); await page.locator('.toggle-add-url').click();
  await page.locator('#entry_url').fill('https://utilibre.org/en/'); await page.locator('#entry_url').press('Enter');
  await page.waitForURL(u => u.pathname !== '/new'); await page.goto(origin + '/unread/list');
  await page.locator('a[href^="/view/"]').filter({hasText: /Free online tools/}).first().click();
  assert.match(await page.locator('#article').innerText(), /Utilibre/);
  assert.doesNotMatch(await page.locator('#article').innerText(), /can't retrieve contents/);
  await page.reload(); assert.match(await page.locator('#article').innerText(), /Utilibre/);
  const b = await context(1280), other = await login(b, data.b);
  assert.equal((await other.goto(`${origin}/view/${data.entryId}`)).status(), 404);
  assert.equal((await b.request.get(`${origin}/export/${data.entryId}.json`)).status(), 404);
  const anon = await context(390), visitor = await anon.newPage();
  await visitor.goto(`${origin}/view/${data.entryId}`); await visitor.locator('[name="_password"]').waitFor();
  for (const path of ['/assets/images/example.jpg', '/share/fictional', '/feed/fictional', '/register/', '/api/entries', '/oauth/v2/token']) {
    assert.equal((await anon.request.get(origin + path)).status(), 404, path);
  }
  const cookies = await a.cookies(origin);
  assert(cookies.length && cookies.every(c => c.secure && c.httpOnly));
  // Native deletion of a synthetic article, including its confirmation dialog.
  await page.goto(`${origin}/view/${data.entryId}`);
  const remove = page.locator('button[data-shortcuts-target="deleteEntry"]');
  await remove.waitFor(); page.once('dialog', dialog => dialog.accept());
  await Promise.all([page.waitForURL(u => !u.pathname.startsWith('/view/')), remove.click()]);
  assert.equal((await a.request.get(`${origin}/view/${data.entryId}`)).status(), 404);
  assert.deepEqual([...outside], []); assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
  passed = true;
} finally {
  await browser.close();
  seed('cleanup');
  const report = {checkedAt: new Date().toISOString(), origin, passed,
    environment: 'Public HTTPS through normal DNS/edge; Linux Chromium; 1280px desktop and 390px mobile emulation',
    checks: passed ? ['native password + MFA/CSRF', 'owned-page saving and reload', 'JSON/TXT/PDF/EPUB reopened', 'account A/B isolation', 'anonymous denial', 'native article deletion', 'secure HttpOnly cookies', 'text-first media blocking', 'no external browser responses', 'disabled registration/API/sharing/image paths'] : [],
    externalResponseOrigins: [...outside], scriptErrors: errors, failedAssets,
    syntheticAccountsRemoved: true, untested: ['physical phones/Windows/Opera', 'native/API clients', 'all third-party article sources']};
  await writeFile(output + '/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report)); console.log(`Private evidence: ${output}`);
}

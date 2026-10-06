// --backend uses loopback TLS and does not certify the public edge.
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'https://biblioreads.utilibre.org';
const local = process.argv.includes('--backend');
const output = await mkdtemp('/tmp/utilibre-biblioreads-check-');
let proxy, certificates;
if (local) {
  certificates = await mkdtemp('/tmp/utilibre-biblioreads-tls-');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=biblioreads.utilibre.org', '-keyout', `${certificates}/key.pem`, '-out', `${certificates}/cert.pem`], { stdio: 'ignore' });
  proxy = createServer({ key: await readFile(`${certificates}/key.pem`), cert: await readFile(`${certificates}/cert.pem`) }, (req, res) => {
    const upstream = request({ host: '10.10.1.43', port: 3151, path: req.url, method: req.method, headers: {...req.headers, host: 'biblioreads.utilibre.org'}, timeout: 45000 }, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(443, '127.0.0.1', resolve));
}
const browser = await chromium.launch({headless: true, args: local ? ['--host-resolver-rules=MAP biblioreads.utilibre.org 127.0.0.1', '--no-proxy-server', '--ignore-certificate-errors'] : []});
const external = new Set(), failures = [];
try {
  for (const [name, width, locale] of [['desktop',1280,'en-US'], ['mobile',390,'es-GT']]) {
    const context = await browser.newContext({viewport: {width, height: 844}, locale, ignoreHTTPSErrors: local});
    const page = await context.newPage();
    page.on('request', req => { if (new URL(req.url()).origin !== origin && !req.url().startsWith('blob:')) external.add(new URL(req.url()).origin); });
    page.on('response', res => { if (res.status() >= 400) failures.push([res.status(),new URL(res.url()).pathname]); });
    page.on('pageerror', error => failures.push(['JS',error.message]));
    assert.equal((await page.goto(origin)).status(), 200);
    await page.getByRole('textbox', {name: 'Search', exact:true}).fill('The Hobbit');
    await page.getByRole('button', {name:'Search',exact:true}).click();
    const book = page.locator('a[href^="/book/show/5907"]').first();
    await book.waitFor({timeout: 30000}); await book.click();
    await page.getByRole('button', {name:'add to library',exact:true}).first().waitFor({timeout:30000});
    await page.waitForFunction(() => [...document.images].some(img => img.src.includes('/img?') && img.complete && img.naturalWidth > 0), null, {timeout:30000});
    await page.getByRole('button', {name:'add to library',exact:true}).first().click();
    await page.getByText('Book added to library', {exact:true}).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} book overflow`);
    await page.screenshot({path:`${output}/${name}-book.png`});
    await page.goto(`${origin}/library`);
    await page.locator('a[href^="/book/show/5907"]').first().waitFor();
    await page.getByRole('button', {name:'settings',exact:true}).click();
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', {name:'Export',exact:true}).click();
    const download = await downloaded;
    const backup = await readFile(await download.path(), 'utf8');
    assert.match(backup, /Hobbit/);
    await page.getByRole('button', {name:'Delete All Library Data',exact:true}).click();
    await Promise.all([page.waitForEvent('load'), page.locator('#deleteModal').getByRole('button', {name:'Confirm',exact:true}).click()]);
    await page.getByText('Your Library', {exact:true}).waitFor();
    assert.equal(await page.locator('a[href^="/book/show/5907"]').count(), 0);
    await page.getByRole('button', {name:'settings',exact:true}).click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} library overflow`);
    await page.screenshot({path:`${output}/${name}-library.png`});
    await page.goto(`${origin}/contact`);
    assert.ok(await page.locator('a[href="https://utilibre.org"]').count(), 'Native operator link');
    if (name === 'desktop') {
      const denied = await page.evaluate(async () => Promise.all([
        fetch('/api/search/books', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({queryURL:'http://127.0.0.1/'})}).then(r=>r.status),
        fetch('/api/image?url=http://169.254.169.254/latest/meta-data/').then(r=>r.status),
        fetch('/api/deprecated/book-scraper').then(r=>r.status),
      ]));
      assert.deepEqual(denied, [400,400,404]);
    }
    await context.close();
  }
  assert.equal(external.size, 0, `Browser third parties: ${[...external].join(', ')}`);
  // Deliberate denial probes are expected; all real-workflow failures are reported.
  assert.deepEqual(failures.filter(([status,path]) => !([400,404].includes(status) && ['/api/search/books','/api/image','/api/deprecated/book-scraper'].includes(path))), []);
  console.log(`BiblioReads ${local?'protected backend':'public HTTPS'}: search/book/covers, desktop/mobile, local library export/delete, native operator link and input denials passed. Screenshots: ${output}`);
} finally {
  await browser.close();
  if (proxy) { proxy.closeAllConnections(); await new Promise(resolve=>proxy.close(resolve)); }
  if (certificates) await rm(certificates, {recursive:true});
}

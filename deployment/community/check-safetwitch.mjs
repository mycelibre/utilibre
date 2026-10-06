// Backend mode tests a loopback TLS bridge, not the public edge/certificate.
import assert from 'node:assert/strict';
import { createServer } from 'node:https';
import { request } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'https://twitch.utilibre.org';
const local = process.argv.includes('--backend');
let proxy, directory, browser;
const sockets = new Set();
try {
  if (local) {
    directory = await mkdtemp('/tmp/utilibre-twitch-tls-');
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=twitch.utilibre.org', '-addext', 'subjectAltName=DNS:twitch.utilibre.org',
      '-keyout', `${directory}/key.pem`, '-out', `${directory}/cert.pem`], { stdio: 'ignore' });
    proxy = createServer({ key: await readFile(`${directory}/key.pem`), cert: await readFile(`${directory}/cert.pem`) }, (req, res) => {
      const upstream = request({ host: '10.10.1.43', port: 3146, path: req.url, method: req.method, agent: false,
        headers: { ...req.headers, host: 'twitch.utilibre.org' }, timeout: 35000 }, response => {
        res.writeHead(response.statusCode, response.headers); response.pipe(res);
      });
      upstream.on('timeout', () => upstream.destroy());
      res.on('close', () => upstream.destroy());
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(upstream);
    });
    proxy.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
    await new Promise((resolve, reject) => { proxy.once('error', reject); proxy.listen(443, '127.0.0.1', resolve); });
  }
  browser = await chromium.launch({ headless: true, args: local ? ['--host-resolver-rules=MAP twitch.utilibre.org 127.0.0.1', '--no-proxy-server'] : [] });
  for (const [lang, width] of [['en', 1280], ['es', 390]]) {
    const context = await browser.newContext({ ignoreHTTPSErrors: local, viewport: { width, height: 900 }, locale: 'en-US' });
    const page = await context.newPage();
    const external = new Set(), errors = [], failed = [];
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) external.add(new URL(request.url()).hostname); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failed.push({ path: new URL(response.url()).pathname, status: response.status(), server: response.headers()['server'], cache: response.headers()['cf-cache-status'] }); });
    await page.goto(`${origin}/utilibre-language.html?lang=${lang}`);
    await page.waitForURL(`${origin}/`);
    await page.locator('a[href*="/directory/category/"], a[href*="/directory/game/"]').first().waitFor();
    await page.waitForFunction(() => [...document.images].filter(i => i.complete && i.naturalWidth > 0).length >= 3);
    assert.equal(await page.evaluate(() => localStorage.getItem('language')), lang === 'es' ? 'es-ES' : 'en-US');
    await page.goto(`${origin}/privacy`);
    await page.getByRole('heading', { name: lang === 'es' ? 'Privacidad de esta instancia' : 'Privacy on this instance' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    if (process.argv.includes('--screenshots')) await page.screenshot({ path: `/tmp/utilibre-twitch-${lang}-${width}.png`, fullPage: true });
    if (lang === 'en') {
      await page.goto(`${origin}/jynxzi`);
      const video = page.locator('video').first();
      await video.waitFor();
      await video.evaluate(v => { v.muted = true; return v.play(); });
      await page.waitForFunction(() => { const v=document.querySelector('video'); return v && v.currentTime > 2 && v.videoWidth > 0; }, null, { timeout: 30000 });
      console.log('Decoded live video frames and playback progressed beyond two seconds.');
      await video.evaluate(v => v.pause());
      for (const endpoint of ['isLive', 'followingStreamer']) {
        const result = await page.evaluate(async endpoint => {
          const response = await fetch(`/api/users/${endpoint}/bulk`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ streamers: ['jynxzi'] }) });
          return { status: response.status, body: await response.json() };
        }, endpoint);
        assert.equal(result.status, 200);
        assert.equal(result.body.status, 'ok');
      }
    }
    assert.deepEqual([...external], [], 'Unexpected third-party browser connections');
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    assert.deepEqual(failed, [], 'HTTP failures during ordinary use');
    if (lang === 'en') {
      const denied = await page.evaluate(async () => {
        const r = await fetch('/api/users/isLive/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ streamers: Array(36).fill('jynxzi') }) });
        return r.status;
      });
      assert.equal(denied, 400, 'Oversized follow lookup must be denied');
    }
    console.log(`SafeTwitch ${lang}/${width}: discovery images, locale, privacy page and first-party-only requests passed.`);
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  if (proxy) { for (const socket of sockets) socket.destroy(); proxy.closeAllConnections(); await new Promise(resolve => proxy.close(resolve)); }
  if (directory) await rm(directory, { recursive: true });
}

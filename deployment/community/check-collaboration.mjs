import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = process.env.UTILIBRE_COLLAB_TEST_ORIGIN || 'http://127.0.0.1:3169';
assert(['http://127.0.0.1:3169', 'https://collab.utilibre.org'].includes(origin), 'Use only the authorized local/public pilot');
const browser = await chromium.launch();
const contexts = await Promise.all([browser.newContext({ locale: 'en', reducedMotion: 'reduce' }), browser.newContext({ locale: 'es', reducedMotion: 'reduce' })]);
const pages = await Promise.all(contexts.map(c => c.newPage()));
const room = `synthetic-${Date.now()}`; const external = new Set();
try {
  for (const page of pages) {
    page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== origin) external.add(new URL(r.url()).origin); });
    const response = await page.goto(`${origin}/boards/${room}`);
    assert.equal(response.status(), 200, 'Backend must be ready before the workflow test');
    await page.locator('#utilibre-notice[open]').waitFor();
    const notice = await page.locator('#utilibre-notice').innerText();
    assert.match(notice, page === pages[0] ? /no end-to-end encryption/ : /no hay cifrado de extremo a extremo/);
    await page.locator('#utilibre-notice button').click();
    await page.waitForFunction(() => window.WBOApp?.connection?.socket?.connected);
    await page.locator('#toolID-rectangle:not(.disabledTool)').waitFor();
  }
  for (const [i,page] of pages.entries()) {
    await page.locator('#toolID-rectangle').click(); await page.mouse.move(300+i*240,250); await page.mouse.down(); await page.mouse.move(460+i*240,380,{steps:3}); await page.mouse.up();
    await pages[1-i].waitForFunction(n => document.querySelectorAll('#drawingArea rect').length === n, i+1);
  }
  await contexts[1].setOffline(true); await pages[1].waitForFunction(() => !window.WBOApp.connection.socket.connected);
  await contexts[1].setOffline(false); await pages[1].reload(); await pages[1].waitForFunction(() => window.WBOApp?.connection?.socket?.connected && document.querySelectorAll('#drawingArea rect').length === 2);
  const event = pages[0].waitForEvent('download'); await pages[0].locator('#toolID-download').click(); const bytes = await readFile(await (await event).path());
  assert.match(bytes.toString(), /<svg/); assert.equal((bytes.toString().match(/<rect id="r/g)||[]).length,2);
  for (const [i, page] of pages.entries()) {
    await page.setViewportSize({ width: i ? 390 : 1280, height: 800 });
    await page.goto(`${origin}/?lang=${i ? 'es' : 'en'}`);
    assert.equal(await page.locator(i ? '.utilibre-es' : '.utilibre-en').isVisible(), true);
    assert.equal(await page.locator(i ? '.utilibre-en' : '.utilibre-es').isVisible(), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `/tmp/utilibre-wbo-${i ? 'es-mobile' : 'en-desktop'}.png`, fullPage: true });
  }
  const denied = await pages[0].request.get(`${origin}/socket.io/?EIO=4&transport=polling`, { headers: { Origin: 'https://untrusted.invalid' } });
  assert.equal(denied.status(), 403);
  const source = await pages[0].request.get(`${origin}/utilibre-source/wbo-utilibre.tar.gz`);
  assert.equal(source.status(), 200);
  const oversized = await pages[0].request.post(`${origin}/`, { data: 'x'.repeat(65537) });
  assert.equal(oversized.status(), 413);
  assert.deepEqual([...external], []);
  console.log(JSON.stringify({ at:new Date().toISOString(), result:'PASS', origin, version:'WBO 2.9.0-p2', sessions:2, checks:['English/Spanish privacy notice','bidirectional drawing','disconnect/reconnect','server scene replay','SVG export','localized desktop/mobile landing','foreign Origin rejected','source download','oversized body rejected'], externalRequests:0, limitations:['no image upload tool in this upstream','simulated mobile viewport; no real phone test','not a capacity or durable-storage test'] }));
} finally { await browser.close(); }

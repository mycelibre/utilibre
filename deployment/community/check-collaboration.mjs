import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'http://127.0.0.1:3169';
const browser = await chromium.launch();
const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
const pages = await Promise.all(contexts.map(c => c.newPage()));
const room = `synthetic-${Date.now()}`; const external = new Set();
try {
  for (const page of pages) {
    page.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== origin) external.add(new URL(r.url()).origin); });
    await page.goto(`${origin}/boards/${room}`);
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
  assert.deepEqual([...external], []);
  console.log(JSON.stringify({ at:new Date().toISOString(), result:'PASS', version:'WBO 2.9.0-p1', sessions:2, checks:['bidirectional drawing','disconnect/reconnect','server scene replay','SVG export'], externalRequests:0, limitations:['loopback pilot only','no image upload tool in this upstream','limits enforcement checked separately; not inferred from this UI test'] }));
} finally { await browser.close(); }

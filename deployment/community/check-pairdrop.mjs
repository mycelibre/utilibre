// Two isolated browsers, real public HTTPS/WebSocket signaling and WebRTC data.
// Only a synthetic file is sent; no WebSocket file fallback or TURN is enabled.
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const origin = 'https://drop.utilibre.org';
const browser = await chromium.launch();
const payload = Buffer.from('Utilibre synthetic file-transfer check.\nSin datos personales.\n');
try {
  const sender = await browser.newContext({ locale: 'en-US' });
  const receiver = await browser.newContext({ locale: 'es-GT', acceptDownloads: true });
  const pages = await Promise.all([sender.newPage(), receiver.newPage()]);
  const errors = [], external = new Set();
  for (const page of pages) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) {
        external.add(new URL(request.url()).origin);
      }
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  for (const page of pages) {
    await page.locator('x-peer input[type=file]:enabled').waitFor({ state: 'attached', timeout: 45000 });
    assert.equal(await page.locator('x-peer').count(), 1, 'Only the synthetic peer may receive this test');
  }
  await pages[0].locator('x-peer input[type=file]').setInputFiles({
    name: 'utilibre-synthetic.txt', mimeType: 'text/plain', buffer: payload,
  });
  await pages[1].locator('#accept-request').click({ timeout: 30000 });
  const downloadReady = pages[1].waitForEvent('download', { timeout: 30000 });
  await pages[1].locator('#download-btn').click({ timeout: 30000 });
  const download = await downloadReady;
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(Buffer.concat(chunks), payload, 'Received bytes must match the synthetic file');
  assert.equal(download.suggestedFilename(), 'utilibre-synthetic.txt');
  // Chromium denies this optional screen-awake request in a background tab.
  // It does not stop the verified transfer; do not hide any other JS error.
  assert.deepEqual(errors.filter(error => error !== 'Wake Lock permission request denied'), []);
  assert.deepEqual([...external], []);
  console.log('PairDrop public HTTPS: discovery, approval and exact-byte WebRTC transfer passed.');
  console.log('Browsers share this test machine; restrictive/different NAT networks remain untested.');
} catch (error) {
  // Avoid retaining room identifiers, browser state or visitor content in logs.
  console.error('PairDrop synthetic workflow failed:', String(error.message).replace(/https?:\/\/\S+/g, '[URL]').slice(0,700));
  process.exitCode = 1;
} finally {
  await browser.close();
}

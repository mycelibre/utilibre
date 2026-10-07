// Bounded synthetic browser checks. No visitor data or third-party submissions.
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch({ headless: true });
const evidence = [];
const capture = new URL('../../.impeccable/review/creative-tools/', import.meta.url).pathname;
mkdirSync(capture, { recursive: true });
async function pageFor(host) {
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  // Exercise the upstream cross-browser download fallback, not an OS picker.
  await page.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  const violations = []; const failures = []; const edgeRequests = [];
  page.on('request', req => {
    if (/^https?:/.test(req.url()) && new URL(req.url()).hostname !== `${host}.utilibre.org`) violations.push(req.url());
    if (!['GET', 'HEAD'].includes(req.method())) {
      if (new URL(req.url()).pathname.startsWith('/cdn-cgi/challenge-platform/')) {
        edgeRequests.push(req.method());
        if ((req.postData() || '').includes('__injected')) violations.push('Test image marker in edge request');
      } else violations.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('websocket', s => violations.push(s.url()));
  page.on('pageerror', e => failures.push(e.message));
  await page.goto(`https://${host}.utilibre.org/`);
  return { page, violations, failures, edgeRequests };
}
function exifJpeg(jpeg, text) {
  const value = Buffer.from(text + '\0');
  const tiff = Buffer.alloc(26 + value.length);
  tiff.write('II'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(1, 8); tiff.writeUInt16LE(0x013b, 10); tiff.writeUInt16LE(2, 12);
  tiff.writeUInt32LE(value.length, 14); tiff.writeUInt32LE(26, 18); value.copy(tiff, 26);
  const payload = Buffer.concat([Buffer.from('Exif\0\0'), tiff]);
  const marker = Buffer.from([0xff, 0xe1, 0, 0]); marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([jpeg.subarray(0, 2), marker, payload, jpeg.subarray(2)]);
}
try {
  if (!process.env.APP || process.env.APP === 'scrub') {
    const { page, violations, failures, edgeRequests } = await pageFor('scrub');
    page.on('dialog', d => d.accept());
    const jpeg = Buffer.from(await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = c.height = 400;
      const x = c.getContext('2d'); x.fillStyle = 'white'; x.fillRect(0, 0, 400, 400);
      return c.toDataURL('image/jpeg').split(',')[1];
    }), 'base64');
    const marker = '<img src=x onerror="window.__injected=1">';
    await page.locator('#file-input').setInputFiles({ name: marker + '.jpg', mimeType: 'image/jpeg', buffer: exifJpeg(jpeg, marker) });
    await page.waitForFunction(() => window.imageReady === true);
    await page.locator('#continueButtonExif').waitFor();
    assert.match(await page.locator('#exifScrollDiv').innerText(), /<img/);
    assert.equal(await page.locator('#exifScrollDiv img').count(), 0);
    assert.equal(await page.evaluate(() => window.__injected), undefined);
    await page.locator('#continueButtonExif').click();
    assert.equal(await page.locator('#Paint').isChecked(), true);
    const rect = await page.locator('#imageCanvas').boundingBox();
    await page.mouse.move(rect.x + rect.width / 2 - 30, rect.y + rect.height / 2);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 30, rect.y + rect.height / 2, { steps: 8 });
    await page.mouse.up();
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#saveButton').click();
    const download = await downloadEvent;
    const png = readFileSync(await download.path());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.includes(Buffer.from(marker)), false);
    assert.equal(png.includes(Buffer.from('Exif')), false);
    const pixel = await page.evaluate(async data => {
      const image = new Image(); image.src = 'data:image/png;base64,' + data; await image.decode();
      const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
      const x = c.getContext('2d'); x.drawImage(image, 0, 0);
      return [...x.getImageData(200, 200, 1, 1).data];
    }, png.toString('base64'));
    assert.deepEqual(pixel, [0, 0, 0, 255]);
    await page.locator('#file-input').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
    await page.getByText('Cannot open this image.', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => window.imageReady), false);
    assert.deepEqual(violations, []); assert.deepEqual(failures, []);
    evidence.push(`Image Scrubber: malicious filename + real EXIF displayed as text; opaque paint exported; PNG omits original metadata; malformed image rejected; no external requests or application uploads. Cloudflare challenge requests: ${edgeRequests.length}.`);
    await page.close();
  }
  if (!process.env.APP || process.env.APP === 'cyberchef') {
    const { page, violations, failures, edgeRequests } = await pageFor('cyberchef');
    await page.waitForFunction(() => window.app?.appLoaded && window.app?.workerLoaded);
    assert.equal(await page.evaluate(() => ['HTTP request', 'DNS over HTTPS', 'Show on map', 'RSA Verify'].some(k => k in window.app.operations)), false);
    await page.evaluate(() => { window.app.setInput('aG9sYQ=='); window.app.setRecipeConfig([{ op: 'From Base64', args: ['A-Za-z0-9+/=', true, false] }]); });
    await page.getByRole('button', { name: 'BAKE!', exact: false }).click();
    await page.waitForFunction(() => document.querySelector('#output-text')?.textContent.includes('hola'));
    await page.evaluate(() => { window.app.setInput('abc'); window.app.setRecipeConfig([{ op: 'SHA2', args: ['256', 64, 160] }]); });
    await page.waitForTimeout(200); // Upstream sends input to a separate worker.
    await page.getByRole('button', { name: 'BAKE!', exact: false }).click();
    await page.waitForFunction(() => document.querySelector('#output-text')?.textContent.includes('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
    assert.deepEqual(violations, []); assert.deepEqual(failures, []);
    await page.screenshot({ path: capture + 'cyberchef.png' });
    evidence.push(`CyberChef: Base64 decode and known SHA-256 output correct; four restricted operations absent; no external requests or application uploads. Cloudflare challenge requests: ${edgeRequests.length}.`);
    await page.close();
  }
  if (!process.env.APP || process.env.APP === 'whiteboard') {
    const { page, violations, failures } = await pageFor('whiteboard');
    await page.getByRole('button', { name: 'Rectangle', exact: true }).click();
    await page.mouse.move(450, 350); await page.mouse.down();
    await page.mouse.move(700, 520, { steps: 5 }); await page.mouse.up();
    await page.keyboard.press('Control+Shift+E');
    for (const format of ['PNG', 'SVG']) {
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: `Export to ${format}`, exact: true }).click();
      const bytes = readFileSync(await (await event).path());
      if (format === 'PNG') assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
      else assert.match(bytes.toString(), /<svg/);
    }
    await page.keyboard.press('Escape');
    await page.goto('https://whiteboard.utilibre.org/?lng=es');
    await page.getByRole('button', { name: 'Rectángulo', exact: true }).waitFor();
    assert.deepEqual(violations, []); assert.deepEqual(failures, []);
    evidence.push('Excalidraw: rectangle drawn; valid PNG and SVG downloaded through cross-browser fallback; Spanish UI verified; no external requests or application uploads.');
    await page.close();
  }
  if (!process.env.APP || process.env.APP === 'svg') {
    const { page, violations, failures } = await pageFor('svg');
    await page.locator('#storage_cancel').click();
    await page.locator('#tools_rect .menu-button').click();
    await page.mouse.move(520, 350); await page.mouse.down();
    await page.mouse.move(690, 490, { steps: 5 }); await page.mouse.up();
    assert.equal(await page.locator('#svgcontent rect').count(), 1);
    await page.locator('#MenuButton').click();
    const saved = page.waitForEvent('download');
    await page.locator('#tool_save').click();
    const svg = readFileSync(await (await saved).path());
    assert.match(svg.toString(), /<rect/);
    // Reopen the saved artifact in a fresh editor, like returning to work later.
    await page.reload();
    await page.locator('#storage_cancel').click();
    await page.locator('#MenuButton').click();
    const picker = page.waitForEvent('filechooser');
    await page.locator('#tool_open').click();
    await (await picker).setFiles({ name: 'drawing.svg', mimeType: 'image/svg+xml', buffer: svg });
    await page.waitForFunction(() => document.querySelector('#svgcontent rect'));
    // Test upstream sanitization with a synthetic hostile local document.
    const safe = await page.evaluate(() => {
      window.svgEditor.svgCanvas.setSvgString('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="window.__svgInjected=1"><script>window.__svgInjected=1</script><rect width="20" height="20"/></svg>');
      return window.svgEditor.svgCanvas.svgCanvasToString();
    });
    assert.doesNotMatch(safe, /<script|onload=/);
    assert.equal(await page.evaluate(() => window.__svgInjected), undefined);
    assert.deepEqual(violations, []); assert.deepEqual(failures, []);
    evidence.push('SVGEdit: rectangle drawn; SVG exported and reopened; synthetic script/event-handler stripped; no external requests or application uploads.');
    await page.close();
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), environment: 'public HTTPS', evidence }, null, 2));
} finally { await browser.close(); }

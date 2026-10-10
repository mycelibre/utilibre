// The exact public practice files, exercised against the deployed applications.
// Synthetic data only; no accounts or visitor documents. No interception of assets.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch();
const fixture = name => new URL(`../../portal/public/examples/${name}`, import.meta.url);
const evidence = [];
async function download(page, action) {
  const event = page.waitForEvent('download'); await action(); const file = await event;
  assert.equal(await file.failure(), null); return readFile(await file.path());
}
async function decodeImage(page, bytes, mime) {
  return page.evaluate(async ({ base64, mime }) => {
    const image = new Image(); image.src = `data:${mime};base64,${base64}`;
    await image.decode(); return { width: image.naturalWidth, height: image.naturalHeight };
  }, { base64: bytes.toString('base64'), mime });
}
async function run(id, fn) {
  if (process.env.APP && process.env.APP !== id) return;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; delete window.showDirectoryPicker; });
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  const writes = [], external = new Set();
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().includes('/cdn-cgi/')) {
    if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.method() + ' ' + new URL(r.url()).origin);
    if (new URL(r.url()).host !== `${id}.utilibre.org`) external.add(new URL(r.url()).host);
  } });
  try {
    await page.goto(`https://${id}.utilibre.org/`);
    const result = await fn(page);
    assert.deepEqual(writes, [], 'Unexpected application uploads');
    evidence.push({ id, result: 'passed', ...result, applicationWrites: writes.length, externalHosts: [...external] });
  } catch (error) { evidence.push({ id, result: 'failed', error: String(error) }); process.exitCode = 1; }
  await context.close();
}
await run('paint', async page => {
  await page.getByText('File', { exact: true }).click(); await page.getByText('Open', { exact: true }).click();
  const chooser = page.waitForEvent('filechooser'); await page.getByText('Open File ...', { exact: true }).click();
  await (await chooser).setFiles({ name: 'fictional-image.jpg', mimeType: 'image/jpeg', buffer: await readFile(fixture('fictional-image.jpg')) });
  await page.getByText('Image', { exact: true }).click(); await page.getByText('Resize', { exact: true }).click();
  await page.locator('#pop_data_width').fill('600');
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await page.getByText('File', { exact: true }).click(); await page.getByText('Export ...', { exact: true }).click();
  const bytes = await download(page, () => page.getByRole('button', { name: 'Ok', exact: true }).click());
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG'); assert.equal(bytes.readUInt32BE(16), 600); assert.equal(bytes.readUInt32BE(20), 400); assert(bytes.length < 200000);
  assert.deepEqual(await decodeImage(page, bytes, 'image/png'), { width: 600, height: 400 });
  return { width: 600, height: 400, bytes: bytes.length, reopened: 'downloaded PNG decoded in browser' };
});
await run('charts', async page => {
  const results = [];
  for (const lang of ['en', 'es']) {
    if (lang === 'es') await page.reload();
    await page.locator('textarea').first().fill(await readFile(fixture(`study-${lang}.csv`), 'utf8'));
    await page.getByText('Bar chart', { exact: true }).click();
    for (const field of lang === 'en' ? ['Activity', 'Hours'] : ['Actividad', 'Horas']) {
      await page.locator('[draggable=true]').filter({ hasText: field }).dragTo(page.getByText('Drop dimension here', { exact: true }).nth(0));
    }
    const bytes = await download(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    const svg = bytes.toString(); assert.match(svg, /<svg/); for (const label of lang === 'en' ? ['Reading', 'Practice', 'Review'] : ['Lectura', 'Práctica', 'Repaso']) assert(svg.includes(label));
    for (const value of [12, 8, 6]) assert(svg.includes(`>${value}</text>`));
    const decoded = await decodeImage(page, bytes, 'image/svg+xml'); assert(decoded.width > 0 && decoded.height > 0);
    results.push({ lang, rows: 3, bytes: bytes.length });
  }
  return { fixtures: results, format: 'SVG' };
});
await run('scrub', async page => {
  page.on('dialog', d => d.accept());
  await page.locator('#file-input').setInputFiles({ name: 'fictional-image.jpg', mimeType: 'image/jpeg', buffer: await readFile(fixture('fictional-image.jpg')) });
  await page.locator('#continueButtonExif').waitFor(); assert.match(await page.locator('#exifScrollDiv').innerText(), /UTILIBRE FICTIONAL EXAMPLE/);
  await page.locator('#continueButtonExif').click();
  assert(await page.locator('#Paint').isChecked());
  const box = await page.locator('#imageCanvas').boundingBox();
  // Cover the complete text block, using the native paint tool at its default size.
  for (let y = 240; y < 350; y += 10) {
    await page.mouse.move(box.x + 60 / 1200 * box.width, box.y + y / 800 * box.height); await page.mouse.down();
    await page.mouse.move(box.x + 640 / 1200 * box.width, box.y + y / 800 * box.height, { steps: 20 }); await page.mouse.up();
  }
  const bytes = await download(page, () => page.locator('#saveButton').click());
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG'); assert(!bytes.includes(Buffer.from('Exif'))); assert(!bytes.includes(Buffer.from('UTILIBRE FICTIONAL EXAMPLE')));
  const pixel = await page.evaluate(async base64 => {
    const image = new Image(); image.src = 'data:image/png;base64,' + base64; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const x = canvas.getContext('2d'); x.drawImage(image, 0, 0); return [...x.getImageData(200, 280, 1, 1).data];
  }, bytes.toString('base64'));
  assert.deepEqual(pixel, [0, 0, 0, 255]);
  return { bytes: bytes.length, removed: 'original EXIF Artist', paintedPixel: pixel, format: 'flattened PNG' };
});
await browser.close(); console.log(JSON.stringify({ checkedAt: new Date().toISOString(), environment: 'Chromium desktop, public HTTPS, synthetic files', evidence }, null, 2));

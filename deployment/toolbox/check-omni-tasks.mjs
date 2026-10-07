import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
import { wavFixture } from './check-browser-tools.mjs';

const paths = ['csv/csv-to-json', 'string/remove-duplicate-lines', 'image-generic/compress', 'image-generic/editor', 'audio/trim', 'image-generic/remove-background'];
const browser = await chromium.launch();
let failures = 0;
for (const path of paths) {
  if (process.argv[2] && !path.endsWith(process.argv[2])) continue;
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(90000);
  const writes = [], externalResponses = new Set();
  context.on('request', r => { if (!['GET', 'HEAD'].includes(r.method()) && !r.url().includes('/cdn-cgi/challenge-platform/')) writes.push(r.method() + ' ' + r.url()); });
  context.on('response', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== 'https://tools.utilibre.org') externalResponses.add(new URL(r.url()).hostname); });
  try {
    assert.equal((await page.goto('https://tools.utilibre.org/' + path + '?lng=en')).status(), 200);
    let result;
    if (path.startsWith('csv/') || path.startsWith('string/')) {
      const isCsv = path.startsWith('csv/');
      await page.locator('textarea:not([readonly])').first().fill(isCsv ? 'Name,Value\nGuatemala,12\nMexico,8' : 'hola\nadios\nhola');
      await page.waitForFunction(() => document.querySelectorAll('textarea:not([readonly])')[1]?.value.includes('hola') || document.querySelectorAll('textarea:not([readonly])')[1]?.value.includes('Guatemala'));
      const output = await page.locator('textarea:not([readonly])').nth(1).inputValue();
      if (isCsv) assert.deepEqual(JSON.parse(output), [{ Name: 'Guatemala', Value: 12 }, { Name: 'Mexico', Value: 8 }]);
      else assert.equal(output, 'hola\nadios');
      result = { outputCharacters: output.length };
    } else {
      let input;
      if (path.startsWith('audio/')) {
        await page.getByRole('textbox', { name: 'Start Time', exact: true }).fill('00:00:01');
        await page.getByRole('textbox', { name: 'End Time', exact: true }).fill('00:00:02');
        await page.getByRole('radio', { name: 'WAV', exact: true }).check();
        input = { name: 'tone.wav', mimeType: 'audio/wav', buffer: wavFixture() };
      } else {
        const base64 = await page.evaluate(() => {
          const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 600;
          const c = canvas.getContext('2d'); c.fillStyle = 'white'; c.fillRect(0, 0, 800, 600);
          c.fillStyle = '#d85a30'; c.beginPath(); c.arc(400, 300, 180, 0, 2 * Math.PI); c.fill();
          return canvas.toDataURL().split(',')[1];
        });
        input = { name: 'figure.png', mimeType: 'image/png', buffer: Buffer.from(base64, 'base64') };
      }
      await page.locator('input[type=file]').first().setInputFiles(input);
      if (path.endsWith('/editor')) await page.getByRole('button', { name: 'Save', exact: true }).click();
      const pending = page.waitForEvent('download');
      await page.getByRole('button', { name: path.endsWith('/editor') ? 'Save' : 'Download', exact: true }).last().click();
      const download = await pending; assert.equal(await download.failure(), null);
      const bytes = await readFile(await download.path());
      if (path.startsWith('audio/')) {
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
        assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
        // FFmpeg may trim at an audio-frame boundary rather than one sample.
        assert(bytes.length > 170000 && bytes.length < 190000);
      } else {
        const dimensions = await page.evaluate(async b64 => {
          const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
          const image = await createImageBitmap(new Blob([bytes]));
          const c = document.createElement('canvas'); c.width = image.width; c.height = image.height;
          const x = c.getContext('2d'); x.drawImage(image, 0, 0);
          const pixels = x.getImageData(0, 0, c.width, c.height).data;
          let clear = 0, opaque = 0; for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] === 0) clear++; if (pixels[i] > 240) opaque++; }
          image.close(); return { width: c.width, height: c.height, clear, opaque };
        }, bytes.toString('base64'));
        assert(dimensions.width > 0 && dimensions.height > 0);
        if (path.endsWith('/compress')) assert(bytes.length < input.buffer.length);
        if (path.endsWith('/remove-background')) { assert(dimensions.clear > 0); assert(dimensions.opaque > 0); }
        result = dimensions;
      }
      result = { ...result, bytes: bytes.length };
    }
    assert.deepEqual(writes, []);
    for (const host of externalResponses) assert(['cdn.jsdelivr.net', 'unpkg.com', 'rawcdn.githack.com', 'raw.githack.com'].includes(host), `Unexpected external response: ${host}`);
    console.log(JSON.stringify({ path, status: 'PASS', ...result, externalAssetHosts: [...externalResponses], applicationWrites: 0 }));
  } catch (error) { failures++; console.error(JSON.stringify({ path, status: 'FAIL', error: error.message, writes, externalAssetHosts: [...externalResponses] })); }
  await context.close();
}
await browser.close(); process.exitCode = failures ? 1 : 0;

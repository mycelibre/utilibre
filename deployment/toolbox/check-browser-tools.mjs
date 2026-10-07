// Synthetic fixtures only. No visitor files, analytics, or external services.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

export function wavFixture(seconds = 3) {
  const rate = 44100, samples = rate * seconds;
  const b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36);
  b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) b.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / rate) * 9000), 44 + 2 * i);
  return b;
}
async function downloaded(page, action) {
  const pending = page.waitForEvent('download');
  await action(); const download = await pending;
  assert.equal(await download.failure(), null);
  return { name: download.suggestedFilename(), bytes: await readFile(await download.path()) };
}
const tests = {
  async charts(page) {
    await page.locator('textarea').first().fill('Name,Value\nGuatemala,12\nMexico,8\n');
    await page.getByText('Bar chart', { exact: true }).click();
    await page.locator('[draggable=true]').filter({ hasText: 'Name' }).dragTo(page.getByText('Drop dimension here', { exact: true }).nth(0));
    await page.locator('[draggable=true]').filter({ hasText: 'Value' }).dragTo(page.getByText('Drop dimension here', { exact: true }).nth(0));
    const result = await downloaded(page, () => page.getByRole('button', { name: 'Download', exact: true }).click());
    const svg = result.bytes.toString();
    assert.match(svg, /<svg/); assert.match(svg, /Guatemala/); assert.match(svg, /Mexico/);
    assert.match(svg, />12<\/text>/);
    return { rows: 2, format: 'SVG', bytes: result.bytes.length };
  },
  async zip(page) {
    const original = Buffer.from('Hola, Utilibre! ZIP round trip.\n');
    let chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Add files', exact: true }).click();
    await (await chooser).setFiles({ name: 'utilibre-check.txt', mimeType: 'text/plain', buffer: original });
    await page.getByRole('button', { name: 'Export zip', exact: true }).click();
    const archive = await downloaded(page, () => page.locator('dialog[open]').getByRole('button', { name: 'Export', exact: true }).click());
    assert.equal(archive.bytes.readUInt32LE(0), 0x04034b50);
    await page.reload();
    chooser = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Import zip', exact: true }).click();
    await (await chooser).setFiles({ name: 'roundtrip.zip', mimeType: 'application/zip', buffer: archive.bytes });
    await page.getByText('utilibre-check.txt', { exact: true }).click();
    const extracted = await downloaded(page, async () => {
      await page.getByRole('button', { name: 'Extract', exact: true }).click();
      const confirm = page.locator('dialog[open]').getByRole('button', { name: 'Extract', exact: true });
      if (await confirm.isVisible()) await confirm.click();
    });
    assert.deepEqual(extracted.bytes, original);
    return { archiveBytes: archive.bytes.length, extractedBytes: extracted.bytes.length };
  },
  async audio(page) {
    const ok = page.getByText('OK', { exact: true });
    await ok.waitFor(); await ok.click();
    // Native upstream keyboard action opens the same local-file picker as File.
    await page.evaluate(() => window.PKAudioEditor.fireEvent('RequestLoadLocalFile'));
    await page.locator('input[type=file]').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: wavFixture() });
    await page.waitForFunction(() => window.PKAudioEditor.engine.is_ready);
    assert.equal(await page.evaluate(() => window.PKAudioEditor.engine.wavesurfer.getDuration()), 3);
    // Exercise native selection/export, not a test-side audio encoder as output.
    await page.evaluate(() => window.PKAudioEditor.engine.wavesurfer.regions.add({ start: 0.5, end: 1.5, id: 't' }));
    await page.getByRole('button', { name: 'File', exact: true }).click();
    await page.getByRole('button', { name: 'Export / Download', exact: true }).click();
    await page.locator('label[for=k02]').click(); await page.locator('label[for=k5]').click();
    const result = await downloaded(page, () => page.getByText('Export', { exact: true }).click());
    assert.equal(result.bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(result.bytes.toString('ascii', 8, 12), 'WAVE');
    // One second, mono, 16-bit at 44.1 kHz, allowing WAV metadata chunks.
    assert(result.bytes.length >= 88244 && result.bytes.length < 88400);
    return { inputSeconds: 3, exportedSeconds: 1, bytes: result.bytes.length };
  },
  async paint(page) {
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Open', { exact: true }).click();
    const chooser = page.waitForEvent('filechooser');
    await page.getByText('Open File ...', { exact: true }).click();
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 160; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#d85a30'; x.fillRect(0, 0, 160, 120); return c.toDataURL().split(',')[1]; });
    await (await chooser).setFiles({ name: 'utilibre-test.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    await page.getByText('File', { exact: true }).click();
    await page.getByText('Export ...', { exact: true }).click();
    const result = await downloaded(page, () => page.getByRole('button', { name: 'Ok', exact: true }).click());
    assert.equal(result.bytes.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(result.bytes.readUInt32BE(16), 160); assert.equal(result.bytes.readUInt32BE(20), 120);
    return { width: 160, height: 120, bytes: result.bytes.length };
  },
};

if (process.argv[1]?.endsWith('check-browser-tools.mjs')) {
  const browser = await chromium.launch();
  let failures = 0;
  for (const [id, test] of Object.entries(tests)) {
    if (process.argv[2] && process.argv[2] !== id) continue;
    const origin = `https://${id}.utilibre.org`;
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => { delete window.showOpenFilePicker; delete window.showSaveFilePicker; delete window.showDirectoryPicker; });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const external = new Set(), errors = [], writes = [];
    context.on('request', r => { if (/^https?:/.test(r.url()) && new URL(r.url()).origin !== origin) external.add(r.url()); if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.method() + ' ' + r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    try {
      assert.equal((await page.goto(origin + '/?lang=en')).status(), 200);
      const result = await test(page);
      const applicationWrites = writes.filter(url => !url.includes('/cdn-cgi/challenge-platform/'));
      assert.deepEqual([...external], []); assert.deepEqual(applicationWrites, []); assert.deepEqual(errors, []);
      console.log(JSON.stringify({ id, status: 'PASS', ...result, externalRequests: 0, applicationWrites: 0, cloudflareSecurityRequests: writes.length }));
    } catch (error) { failures++; console.error(JSON.stringify({ id, status: 'FAIL', error: error.message, external: [...external], errors, writes })); }
    await context.close();
  }
  await browser.close(); process.exitCode = failures ? 1 : 0;
}

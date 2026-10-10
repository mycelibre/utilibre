// Synthetic browser checks. The runner fetches an upstream public test fixture;
// the application/browser must not upload audio or contact that fixture host.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const origin = process.env.WHISPER_CHECK_URL || 'https://transcribe.utilibre.org';
assert.ok(['https://transcribe.utilibre.org', 'http://127.0.0.1:3347'].includes(origin));
const response = await fetch('https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/jfk.wav', { signal: AbortSignal.timeout(30000) });
assert.equal(response.status, 200);
assert.ok(Number(response.headers.get('content-length')) < 4 * 1024 ** 2);
const fixture = Buffer.from(await response.arrayBuffer());
assert.equal(createHash('sha256').update(fixture).digest('hex'), 'aa81c2552465568567e670f3823117e633900d16bd6202346a72f3c8464c74c8');
const output = await mkdtemp('/tmp/utilibre-whisper-check-');
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
async function choose(page, name, buffer) {
  const ready = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'From file', exact: true }).click();
  await (await ready).setFiles({ name, mimeType: 'audio/wav', buffer });
}
try {
  for (const [name, width] of [['desktop', 1280], ['mobile', 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, permissions: ['microphone'], serviceWorkers: 'block' });
    const errors = [], external = new Set(), uploads = [];
    context.on('request', request => {
      if (!/^https?:/.test(request.url())) return;
      if (new URL(request.url()).origin !== origin) external.add(new URL(request.url()).origin);
      if (!['GET', 'HEAD'].includes(request.method())) uploads.push(request.method());
    });
    await context.addInitScript(() => {
      window.qaStreams = [];
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (...args) => {
        if (window.qaDeny) throw new DOMException('Synthetic denial', 'NotAllowedError');
        const stream = await original(...args);
        window.qaStreams.push(stream);
        if (window.qaDelay) await new Promise(resolve => setTimeout(resolve, 800));
        return stream;
      };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await choose(page, 'broken.wav', Buffer.from('synthetic invalid audio'));
    await page.getByRole('alert').filter({ hasText: 'could not read' }).waitFor();
    await choose(page, 'public-speech.wav', fixture);
    await page.getByRole('button', { name: 'Transcribe Audio', exact: true }).waitFor();
    assert.equal(await page.getByRole('alert').count(), 0, 'A valid file clears the read error');

    if (name === 'desktop' && !process.argv.includes('--microphone-only')) {
      // One denied model file reproduces a failed pipeline promise. Retrying
      // must actually refetch it, not immediately repeat the cached rejection.
      const model = '**/models/**/onnx/encoder_model_quantized.onnx';
      await context.route(model, route => route.fulfill({ status: 503, body: 'Synthetic temporary failure' }));
      await page.getByRole('button', { name: 'Transcribe Audio', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'could not finish' }).waitFor({ timeout: 60000 });
      await context.unroute(model);
      await page.getByRole('button', { name: 'Transcribe Audio', exact: true }).click();
      await page.getByRole('button', { name: 'Export TXT', exact: true }).waitFor({ timeout: 180000 });
      const ready = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export TXT', exact: true }).click();
      const stream = await (await ready).createReadStream(), chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      assert.match(Buffer.concat(chunks).toString(), /country/i);
      assert.equal(await page.getByRole('alert').count(), 0);
      console.log('Whisper: failed model download recovered; real short speech transcribed and TXT exported.');
    }

    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
    await page.getByRole('button', { name: /Stop Recording/ }).waitFor();
    await page.waitForTimeout(400);
    await page.getByRole('button', { name: /Stop Recording/ }).click();
    assert.deepEqual(await page.evaluate(() => window.qaStreams.flatMap(s => s.getTracks().map(t => t.readyState))), ['ended']);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });

    // Close while recording; then close while permission is still resolving.
    for (const delayed of [false, true]) {
      await page.evaluate(value => { window.qaDelay = value; }, delayed);
      await page.getByRole('button', { name: 'Record', exact: true }).click();
      await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
      if (!delayed) await page.getByRole('button', { name: /Stop Recording/ }).waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.waitForFunction(() => window.qaStreams.every(s => s.getTracks().every(t => t.readyState === 'ended')));
    }
    await page.evaluate(() => { window.qaDeny = true; });
    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await page.getByRole('button', { name: 'Start Recording', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Microphone unavailable' }).waitFor();
    // Capture the settled native dialog, not HeadlessUI's 300 ms entrance fade.
    await page.waitForTimeout(350);
    await page.screenshot({ path: `${output}/${name}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.deepEqual([...external], []);
    assert.deepEqual(uploads, []);
    console.log(`Whisper ${name}: invalid-file recovery, Stop/Close/late-permission mic release, denied-mic guidance and no browser uploads/external requests passed.`);
    await context.close();
  }
  console.log(`Screenshots: ${output}. Mobile is emulated; long recordings/physical phones are not certified.`);
} finally {
  await browser.close();
}

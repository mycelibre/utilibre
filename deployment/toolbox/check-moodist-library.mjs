import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'https://moodist.invalid/apps/moodist/';
const report = process.argv[3] || '/opt/utilibre/reports/moodist-20261010';
const manifest = JSON.parse(await readFile(new URL('./moodist-recordings.json', import.meta.url), 'utf8'));
await mkdir(report, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
const requests = [], outside = [], errors = [], decoded = [];
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  requests.push({ path: url.pathname, method: route.request().method() });
  if (url.origin !== new URL(base).origin) { outside.push(url.href); return route.abort(); }
  if (url.hostname === 'moodist.invalid') {
    const relative = url.pathname.replace(/^\/apps\/moodist\//, '');
    return route.fulfill({ path: path.join('/opt/utilibre/src/moodist/dist', relative || 'index.html') });
  }
  return route.continue();
});
await context.addInitScript(() => {
  if (!localStorage.getItem('moodist-sounds')) {
    localStorage.setItem('moodist-sounds', JSON.stringify({ version: 0, state: { sounds: { 'white-noise': { isSelected: false, isFavorite: true, isOscillating: false, volume: 0.2 } } } }));
  }
  localStorage.setItem('utilibre-test-sentinel', 'unrelated-fictional-data');
  window.__audioStarts = 0;
  const start = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (...args) { window.__audioStarts++; return start.apply(this, args); };
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(base);
  await page.waitForFunction(() => document.querySelector('astro-island[component-export="App"]')?.hasAttribute('ssr') === false);
  await page.getByRole('button', { name: 'Menu', exact: true }).waitFor();
  await page.locator('#category-noise').getByRole('button', { name: 'White Noise sound', exact: true }).click();
  await page.waitForFunction(() => Object.keys(JSON.parse(localStorage.getItem('moodist-sounds')).state.sounds).length === 13);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('moodist-sounds')).state.sounds['white-noise'].isFavorite), true);
  await page.locator('#category-noise').getByRole('button', { name: 'White Noise sound', exact: true }).click();
  for (const track of manifest.recordings) {
    const result = await page.evaluate(async file => {
      const response = await fetch(`/apps/moodist/sounds/recordings/${file}`);
      if (!response.ok) throw Error(`Audio fetch ${response.status}`);
      const audio = new AudioContext();
      const buffer = await audio.decodeAudioData(await response.arrayBuffer());
      const pcm = buffer.getChannelData(0);
      let power = 0, peak = 0;
      for (const value of pcm) { power += value * value; peak = Math.max(peak, Math.abs(value)); }
      await audio.close();
      return { file, duration: buffer.duration, channels: buffer.numberOfChannels, rms: Math.sqrt(power / pcm.length), peak };
    }, track.file);
    assert(result.duration > 5 && result.rms > 0.0001 && result.peak <= 1.05, JSON.stringify(result));
    decoded.push(result);
    const starts = await page.evaluate(() => window.__audioStarts);
    const control = page.getByRole('button', { name: `${track.label} sound`, exact: true });
    await control.click();
    await page.waitForFunction(value => window.__audioStarts > value, starts);
    await control.click();
  }
  await page.getByRole('button', { name: 'Play a mix', exact: true }).click();
  await page.getByRole('button', { name: 'Rainy café Rain · Coffee Shop', exact: true }).click();
  await page.waitForFunction(() => {
    const sounds = JSON.parse(localStorage.getItem('moodist-sounds')).state.sounds;
    return sounds.rain.isSelected && sounds['coffee-shop'].isSelected && !sounds['white-noise'].isSelected;
  });
  await page.getByRole('button', { name: 'Save current mix', exact: true }).click();
  await page.getByPlaceholder('Name this mix').fill('Fictional QA rainy café');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('moodist-presets') || '{}').state?.presets?.some(preset => preset.label === 'Fictional QA rainy café'));
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForFunction(() => document.querySelector('astro-island[component-export="App"]')?.hasAttribute('ssr') === false);
  await page.getByRole('button', { name: 'Play a mix', exact: true }).click();
  await page.getByRole('button', { name: 'Fictional QA rainy café Saved mix', exact: true }).click();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByText('Binaural Beats', { exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByText('Binaural Beat', { exact: true }).waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => localStorage.getItem('utilibre-test-sentinel')), 'unrelated-fictional-data');
  await page.getByRole('heading', { name: 'Browse sounds', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${report}/desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Ocean Waves sound', exact: true }).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow');
  await page.screenshot({ path: `${report}/mobile.png` });
  assert.deepEqual(outside, []);
  assert.deepEqual(errors, []);
  assert(requests.every(request => request.method === 'GET'));
  const result = { date: new Date().toISOString(), base, decoded, outside, errors, requests, oldFavoritePreserved: true, savedMixReload: true, binauralStartStop: true, mobile: '390px Chromium simulation; no physical phone/audio-device test' };
  await writeFile(`${report}/result.json`, JSON.stringify(result, null, 2));
  console.log(`PASS: ${decoded.length} recording decodes/playback, native mix/save/reload, old favorite, binaural, desktop/mobile, no outside requests or POSTs`);
} finally { await browser.close(); }

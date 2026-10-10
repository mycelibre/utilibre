import assert from 'node:assert/strict';
import { chromium } from '../../../portal/node_modules/playwright/index.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'https://moocup.invalid/apps/moocup/';
const output = '/opt/utilibre/reports/moocup-20261009';
await mkdir(output, { recursive: true, mode: 0o700 });
const browser = await chromium.launch();
const report = { checkedAt: new Date().toISOString(), base, outside: [], errors: [], consoleErrors: [], requests: [], checks: [] };
const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
try {
  for (const [name, locale, viewport] of [
    ['desktop', 'en-US', { width: 1280, height: 800 }],
    ['mobile', 'es-ES', { width: 375, height: 812 }],
  ]) {
    const context = await browser.newContext({ locale, viewport, acceptDownloads: true, serviceWorkers: 'block' });
    await context.addInitScript(() => localStorage.setItem('theme', 'fictional-other-tool'));
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      report.requests.push({ path: url.pathname, method: route.request().method() });
      if (url.origin !== new URL(base).origin) {
        report.outside.push(url.href); return route.abort();
      }
      if (url.hostname === 'moocup.invalid') {
        const relative = url.pathname.replace(/^\/apps\/moocup\//, '') || 'index.html';
        if (relative.includes('..')) throw new Error('Unexpected fixture path');
        return route.fulfill({ path: path.join('/opt/utilibre/src/moocup/build', relative), headers: { 'Content-Security-Policy': csp } });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
    await page.goto(base);
    await page.getByText('Drop image here or click to upload', { exact: true }).waitFor();
    const fixture = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 500; canvas.height = 280;
      const draw = canvas.getContext('2d');
      draw.fillStyle = '#ffffff'; draw.fillRect(0, 0, 500, 280);
      draw.fillStyle = '#153d64'; draw.fillRect(0, 0, 500, 65);
      draw.fillStyle = '#ffffff'; draw.font = 'bold 24px sans-serif'; draw.fillText('Fictional project board', 20, 42);
      draw.fillStyle = '#43a47a'; draw.fillRect(25, 95, 200, 145);
      draw.fillStyle = '#f2a844'; draw.fillRect(255, 95, 220, 145);
      draw.fillStyle = '#142436'; draw.font = '20px sans-serif';
      draw.fillText('Sample only', 40, 135); draw.fillText('No private data', 270, 135);
      return canvas.toDataURL('image/png');
    });
    const bytes = Buffer.from(fixture.split(',')[1], 'base64');
    await writeFile(output + '/fictional-screenshot.png', bytes);
    const transfer = await page.evaluateHandle(values => {
      const data = new DataTransfer();
      data.items.add(new File([new Uint8Array(values)], 'fictional-screenshot.png', { type: 'image/png' }));
      return data;
    }, [...bytes]);
    await page.getByText('Drop image here or click to upload', { exact: true }).dispatchEvent('drop', { dataTransfer: transfer });
    await page.getByAltText('Uploaded mockup', { exact: true }).waitFor();
    await page.reload();
    await page.getByAltText('Uploaded mockup', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'fictional-other-tool');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await writeFile(output + '/' + name + '-export-dialog.txt', await page.locator('body').ariaSnapshot());
    await page.getByRole('radio', { name: 'Standard', exact: true }).click();
    const formats = name === 'desktop' ? ['PNG', 'JPEG', 'WebP'] : ['PNG'];
    const downloads = [];
    for (const format of formats) {
      const choice = page.getByRole('radio', { name: format, exact: true });
      if (await choice.getAttribute('aria-checked') !== 'true') await choice.click();
      const download = page.waitForEvent('download', { timeout: 20000 });
      download.catch(() => {});
      await page.getByRole('button', { name: `Export as ${format}`, exact: true }).click();
      const file = await download.catch(async error => { await writeFile(output + '/failure.json', JSON.stringify(report, null, 2)); throw error; });
      const destination = `${output}/${name}-export.${format.toLowerCase()}`;
      await file.saveAs(destination);
      assert((await readFile(destination)).length > 1000);
      downloads.push(path.basename(destination));
    }
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Export as ' + formats.at(-1), exact: true }).waitFor({ state: 'hidden' });
    await page.screenshot({ path: `${output}/${name}-app.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, `${name}: horizontal overflow`);
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByText('Drop image here or click to upload', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('Drop image here or click to upload', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem('theme')), 'fictional-other-tool');
    report.checks.push({ name, locale, nativeDrop: true, persistedAcrossReload: true, resetRemovedImage: true,
      unrelatedStoragePreserved: true, noHorizontalOverflow: true, downloads });
    await context.close();
  }
  assert.deepEqual(report.outside, []);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.consoleErrors, []);
  assert(report.requests.every(request => request.method === 'GET'));
} finally {
  await browser.close();
  await writeFile(output + '/result.json', JSON.stringify(report, null, 2) + '\n');
}
console.log('PASS native screenshot drop, PNG/JPEG/WebP export, desktop/mobile persistence/reset, no external requests or uploads.');

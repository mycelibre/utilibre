#!/usr/bin/env node
// Public, synthetic end-to-end check. Never supply private documents to this script.
// Prerequisite: cd portal && npm ci && npm run build && npx playwright install chromium
// Run: node deployment/toolbox/check-pdf-tools.mjs
// Diagnostic interception is NOT a production pass; it only isolates stale worker caches.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const require = createRequire(new URL('../../portal/package.json', import.meta.url));
const { chromium } = require('playwright');
const diagnostic = process.argv.includes('--diagnostic-fresh-workers');
assert(process.argv.slice(2).every((arg) => arg === '--diagnostic-fresh-workers'), 'Unknown option');
const origin = 'https://pdf.utilibre.org';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
context.setDefaultTimeout(30_000);
const failures = [];
const assets = new Map();
const externalOrigins = new Set();
const unexpectedWrites = [];
const checks = [];
const pendingHeaders = [];
context.on('request', (request) => {
  const url = new URL(request.url());
  if (url.protocol !== 'https:') return;
  if (url.origin !== origin) externalOrigins.add(url.origin);
  // Cloudflare may perform its own security challenge; not an application upload.
  if (!['GET', 'HEAD'].includes(request.method()) && !url.pathname.startsWith('/cdn-cgi/')) {
    unexpectedWrites.push({ url: url.origin + url.pathname, method: request.method() });
  }
});
context.on('requestfailed', (request) => failures.push({ url: request.url(), reason: request.failure()?.errorText }));
context.on('response', (response) => {
  if (!response.url().startsWith(origin) || !/\.js(?:\?|$)/.test(response.url())) return;
  pendingHeaders.push(response.allHeaders().then((headers) => assets.set(response.url(), {
    url: response.url(), status: response.status(),
    coep: headers['cross-origin-embedder-policy'], coop: headers['cross-origin-opener-policy'],
    corp: headers['cross-origin-resource-policy'], cache: headers['cf-cache-status'],
  })));
});
if (diagnostic) {
  await context.route(/\/assets\/pdf\.worker-[^/]+\.js$|\/workers\/merge\.worker\.js$/, (route) => {
    const url = new URL(route.request().url());
    url.searchParams.set('utilibre-diagnostic', String(Date.now()));
    return route.continue({ url: url.href });
  });
}

async function downloadBytes(download) {
  const stream = await download.createReadStream();
  assert(stream, 'Download has no readable output');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  assert(bytes.length < 5_000_000, 'Unexpectedly large synthetic output');
  return bytes;
}

async function readPdf(page, bytes) {
  assert(bytes.subarray(0, 5).toString() === '%PDF-', 'Output is not a PDF');
  return page.evaluate(async (data) => {
    const main = [...document.querySelectorAll('link[href]')].find((link) => /\/assets\/main-[^/]+\.js$/.test(link.getAttribute('href')));
    if (!main) throw new Error('BentoPDF main module not found; review test for upstream changes');
    const module = await import(main.href);
    // BentoPDF 2.8.8 exposes its PDF.js getDocument implementation as z.
    // Using the deployed parser also exercises the ordinary public worker URL.
    if (typeof module.z !== 'function') throw new Error('BentoPDF PDF.js export changed; update the test');
    const task = module.z({ data: new Uint8Array(data) });
    if (!task?.promise) throw new Error('BentoPDF PDF.js contract changed');
    const pdf = await task.promise;
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const contents = await (await pdf.getPage(number)).getTextContent();
      pages.push(contents.items.map((item) => item.str || '').join(' '));
    }
    await pdf.destroy();
    return { pageCount: pages.length, pages };
  }, [...bytes]);
}

// A raster-only PDF, not an existing selectable text layer. Generated in memory.
function imagePdf(jpeg, width, height) {
  const drawing = Buffer.from(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q\n`);
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]),
    Buffer.concat([Buffer.from(`<< /Length ${drawing.length} >>\nstream\n`), drawing, Buffer.from('endstream')]),
  ];
  const chunks = [Buffer.from('%PDF-1.4\n')];
  const offsets = [];
  let length = chunks[0].length;
  for (const [index, object] of objects.entries()) {
    offsets.push(length);
    const chunk = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')]);
    chunks.push(chunk); length += chunk.length;
  }
  chunks.push(Buffer.from(`xref\n0 6\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`));
  return Buffer.concat(chunks);
}

async function mergeCheck() {
  const page = await context.newPage();
  await page.goto(`${origin}/merge-pdf.html`, { waitUntil: 'networkidle' });
  assert(await page.evaluate(() => crossOriginIsolated), 'PDF page lost cross-origin isolation');
  await page.locator('#file-input').setInputFiles(['a', 'b'].map((letter) => fileURLToPath(new URL(`../../portal/public/examples/pdf-en-${letter}.pdf`, import.meta.url))));
  // The upstream button becomes visible before asynchronous file parsing finishes.
  await page.waitForFunction(() => document.querySelectorAll('#file-list > *').length === 2);
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 45_000 }), page.locator('#process-btn').click()]);
  const output = await readPdf(page, await downloadBytes(download));
  assert.equal(output.pageCount, 2);
  assert.match(output.pages[0], /UTILIBRE SAMPLE A/);
  assert.match(output.pages[1], /UTILIBRE SAMPLE B/);
  checks.push({ task: 'merge', result: 'passed', filename: download.suggestedFilename(), ...output });
  await page.close();
}

async function ocrCheck(language) {
  const page = await context.newPage();
  await page.goto(`${origin}/${language === 'es' ? 'es/' : ''}ocr-pdf.html`, { waitUntil: 'networkidle' });
  const lines = language === 'es' ? ['María Ejemplo', '12 de mayo de 2030', '24 libros'] : ['María Example', '12 May 2030', '24 books'];
  const fixture = await readFile(new URL(`../../portal/public/examples/scan-${language}.pdf`, import.meta.url));
  assert.equal((await readPdf(page, fixture)).pages[0], '', 'Practice scan must have no existing text layer');
  await page.locator('#file-input').setInputFiles({ name: `scan-${language}.pdf`, mimeType: 'application/pdf', buffer: fixture });
  for (const checked of await page.locator('.lang-checkbox:checked').all()) await checked.uncheck();
  const checkbox = page.locator(`.lang-checkbox[value="${language === 'es' ? 'spa' : 'eng'}"]`);
  await checkbox.check();
  const languageLabel = (await checkbox.locator('..').innerText()).trim();
  assert.match(languageLabel, language === 'es' ? /Spanish|Español/i : /English|Inglés/i);
  await page.locator('#process-btn').click();
  await page.locator('#ocr-results').waitFor({ state: 'visible', timeout: 60_000 });
  const recognized = await page.locator('#ocr-text-output').inputValue();
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '');
  for (const line of lines) assert(normalize(recognized).includes(normalize(line)), `OCR ${language} did not reproduce useful fixture text: ${recognized}`);
  const manualCorrections = lines.filter(line => !recognized.includes(line));
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#download-searchable-pdf').click()]);
  const output = await readPdf(page, await downloadBytes(download));
  assert.equal(output.pageCount, 1);
  assert.match(output.pages[0], /24/);
  checks.push({ task: 'ocr', language, languageLabel, result: 'passed-with-manual-review', recognized, manualCorrections, searchablePageCount: output.pageCount });
  await page.close();
}

let error;
try {
  await mergeCheck();
  await ocrCheck('en');
  await ocrCheck('es');
  assert.deepEqual(unexpectedWrites, [], 'Unexpected application write/upload requests');
} catch (failure) { error = String(failure); process.exitCode = 1; }
finally {
  await Promise.allSettled(pendingHeaders);
  await browser.close();
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), origin,
    mode: diagnostic ? 'diagnostic-interception-not-production' : 'ordinary-public-requests',
    result: error ? 'failed' : diagnostic ? 'diagnostic-passed-not-production' : 'passed',
    checks, error, failedRequests: failures, unexpectedWrites,
    externalAssetOrigins: [...externalOrigins].sort(),
    workerResponses: [...assets.values()].filter((asset) => /worker/i.test(asset.url)),
    stalePolicyAssets: [...assets.values()].filter((asset) => /,/.test(asset.coep || '')),
    limitations: 'Synthetic Chromium desktop tests only; not all tools, document types, devices, field performance or real-user completion counts. Upstream CDN assets are existing dependencies, not document uploads.',
  }, null, 2));
}

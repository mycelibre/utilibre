#!/usr/bin/env node
// Public, synthetic end-to-end check. Never supply private documents to this script.
// Prerequisite: cd portal && npm ci && npm run build && npx playwright install chromium
// Run: node deployment/toolbox/check-pdf-tools.mjs
// Diagnostic interception is NOT a production pass; it only isolates stale worker caches.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {execFileSync} from 'node:child_process';

const require = createRequire(new URL('../../portal/package.json', import.meta.url));
const { chromium } = require('playwright');
const diagnostic = process.argv.includes('--diagnostic-fresh-workers');
const staged = process.argv.includes('--local-candidate');
const testArtifact=staged?execFileSync('docker',['inspect','--format','{{.Image}}','utilibre-bento-candidate-20261111'],{encoding:'utf8',timeout:10000}).trim():undefined;
const parserSource=process.env.BENTO_TEST_SOURCE;
assert(parserSource, 'Set BENTO_TEST_SOURCE to the reviewed checkout with npm ci dependencies');
assert(process.argv.slice(2).every((arg) => ['--diagnostic-fresh-workers','--local-candidate'].includes(arg)), 'Unknown option');
const origin = 'https://pdf.utilibre.org';
const browser = await chromium.launch({ headless: true, args: staged ? ['--no-proxy-server','--host-resolver-rules=MAP pdf.utilibre.org 127.0.0.1'] : [] });
const context = await browser.newContext({ acceptDownloads: true, ignoreHTTPSErrors: staged });
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

// Independent pinned PDF.js parser: no dependency on minified app export names.
// All requests in this separate context are fulfilled from local test inputs.
const parserContext=await browser.newContext();
await parserContext.route('**/*',async route=>{
  const url=new URL(route.request().url());
  assert.equal(url.origin,'http://pdf-parser.test');
  if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Local PDF output check</title>'});
  assert(['/pdf.mjs','/pdf.worker.mjs'].includes(url.pathname));
  return route.fulfill({contentType:'text/javascript',body:await readFile(resolve(parserSource,'node_modules/pdfjs-dist/legacy/build',url.pathname.slice(1)))});
});
const parserPage=await parserContext.newPage();
await parserPage.goto('http://pdf-parser.test/');
async function readPdf(_page, bytes) {
  assert(bytes.subarray(0, 5).toString() === '%PDF-', 'Output is not a PDF');
  return parserPage.evaluate(async (data) => {
    const module = await import('/pdf.mjs');
    module.GlobalWorkerOptions.workerSrc='/pdf.worker.mjs';
    const task = module.getDocument({ data: new Uint8Array(data),useSystemFonts:false,isEvalSupported:false,disableFontFace:true });
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

async function compressCheck() {
  const page=await context.newPage();
  await page.goto(`${origin}/compress-pdf.html`,{waitUntil:'networkidle'});
  const fixture=await readFile(new URL('../../portal/public/examples/scan-en.pdf',import.meta.url));
  await page.locator('#file-input').setInputFiles({name:'fictional-scan.pdf',mimeType:'application/pdf',buffer:fixture});
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:90000}),page.locator('#process-btn').click()]);
  const bytes=await downloadBytes(download),output=await readPdf(page,bytes);
  assert.equal(output.pageCount,1);
  checks.push({task:'compress',result:'passed',inputBytes:fixture.length,outputBytes:bytes.length,pageCount:output.pageCount,filename:download.suggestedFilename()});
  await page.close();
}

async function markdownCheck() {
  const page=await context.newPage();
  await page.goto(`${origin}/markdown-to-pdf.html`,{waitUntil:'networkidle'});
  await page.locator('#markdown-editor-container textarea').fill('# Fictional workshop\n\nBring 24 books on 12 May 2030.\n\n| Item | Count |\n| --- | --- |\n| Books | 24 |\n\n```mermaid\ngraph LR\nA[Prepare]-->B[Share]\n```');
  await page.waitForFunction(()=>document.querySelector('#mdPreview')?.textContent.includes('Bring 24 books'));
  await page.locator('#mdPreview svg').waitFor({state:'visible'});
  // Headless Chromium cannot accept the OS print dialog. Verify the native
  // button invokes print, then check the same document through Chromium's PDF API.
  await page.evaluate(()=>{window.__utilibrePrintCalled=false;window.print=()=>{window.__utilibrePrintCalled=true;};});
  await page.locator('#mdExport').click();
  assert(await page.evaluate(()=>window.__utilibrePrintCalled));
  const bytes=await page.pdf({format:'A4',printBackground:true});
  const output=await readPdf(page,bytes);
  assert.match(output.pages.join(' '),/Fictional workshop/);
  assert.match(output.pages.join(' '),/24 books/);
  checks.push({task:'markdown-print',result:'passed-headless',pageCount:output.pageCount,limitation:'Print handler and Chromium PDF output verified; OS Save as PDF dialog not automated.'});
  await page.close();
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
  await compressCheck();
  await markdownCheck();
  await ocrCheck('en');
  await ocrCheck('es');
  assert.deepEqual(unexpectedWrites, [], 'Unexpected application write/upload requests');
  assert.deepEqual([...externalOrigins], [], 'PDF/OCR runtime assets must be served by Utilibre');
  assert.deepEqual(failures.filter(x=>!x.reason?.includes('ERR_ABORTED')),[], 'Required app requests failed');
} catch (failure) { error = String(failure); process.exitCode = 1; }
finally {
  await Promise.allSettled(pendingHeaders);
  await browser.close();
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(), origin, testArtifact,
    mode: diagnostic ? 'diagnostic-interception-not-production' : staged ? 'isolated-candidate-local-dns' : 'ordinary-public-requests',
    result: error ? 'failed' : diagnostic ? 'diagnostic-passed-not-production' : 'passed',
    checks, error, failedRequests: failures, unexpectedWrites,
    externalAssetOrigins: [...externalOrigins].sort(),
    workerResponses: [...assets.values()].filter((asset) => /worker/i.test(asset.url)),
    stalePolicyAssets: [...assets.values()].filter((asset) => /,/.test(asset.coep || '')),
    limitations: 'Synthetic Chromium desktop tests only; not all tools, document types, devices, field performance or real-user completion counts. EN/ES OCR assets are locally hosted; recognition still needs human review.',
  }, null, 2));
}

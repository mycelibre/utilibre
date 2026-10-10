// Native headed browser print check, not a stub of window.print or page.pdf().
// Run with DISPLAY pointing to an isolated Xvfb session; fixtures are fictional.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
if (!process.env.DISPLAY) throw Error('Set DISPLAY to an isolated graphical test session.');
const root = await mkdtemp('/tmp/utilibre-markdown-print-');
await mkdir(`${root}/profile/Default`, { recursive: true });
await mkdir(`${root}/output`);
await writeFile(`${root}/profile/Default/Preferences`, JSON.stringify({
  printing: { print_preview_sticky_settings: { appState: JSON.stringify({
    recentDestinations: [{ id: 'Save as PDF', origin: 'local', account: '' }],
    selectedDestinationId: 'Save as PDF', version: 2, isHeaderFooterEnabled: false,
  }) } }, savefile: { default_directory: `${root}/output` },
  download: { default_directory: `${root}/output` },
}));
const context = await chromium.launchPersistentContext(`${root}/profile`, { headless: false, args: ['--kiosk-printing'] });
const reports = [];
try {
  for (const lang of ['en', 'es']) {
    const page = await context.newPage(), external = new Set();
    page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'https://pdf.utilibre.org') external.add(new URL(request.url()).origin); });
    const before = await readdir(`${root}/output`);
    await page.goto(`https://pdf.utilibre.org/${lang === 'es' ? 'es/' : ''}markdown-to-pdf.html`);
    await page.locator('#mdFileInput').setInputFiles(new URL(`../../portal/public/examples/document-${lang}.md`, import.meta.url).pathname);
    await page.locator('#mdPreview h1').waitFor();
    const heading = await page.locator('#mdPreview h1').textContent();
    await page.locator('#mdExport').click({ timeout: 20000 });
    let file;
    for (let i = 0; i < 40; i++) { file = (await readdir(`${root}/output`)).find(f => f.endsWith('.pdf') && !before.includes(f)); if (file) break; await new Promise(r => setTimeout(r, 250)); }
    assert(file, 'Native print must save a PDF');
    const bytes = await readFile(`${root}/output/${file}`);
    const { getDocument } = await import('/opt/utilibre/src/bentopdf/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    const doc = await getDocument({ data: Uint8Array.from(bytes), useSystemFonts: true }).promise;
    const pages = [];
    for (let n = 1; n <= doc.numPages; n++) pages.push((await (await doc.getPage(n)).getTextContent()).items.map(i => i.str || '').join(' '));
    assert(pages.join(' ').includes(heading)); assert.match(pages.join(' '), /Ana (Example|Ejemplo)/);
    assert.equal(external.size, 0);
    reports.push({ lang, bytes: bytes.length, pages: pages.length, blankTextPages: pages.filter(p => !p.trim()).length, headingRetained: true, externalOrigins: [...external] });
    await doc.destroy(); await page.close();
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), environment: 'Headed Linux Chromium, native Save as PDF automatically selected by kiosk printing; not Windows/Opera or real mobile', reports, syntheticOutput: `${root}/output` }, null, 2));
} finally { await context.close(); }

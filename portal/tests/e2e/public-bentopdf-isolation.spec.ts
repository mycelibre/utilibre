import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const publicPdfBase = process.env.PUBLIC_PDF_BASE_URL;

test('public BentoPDF response is exactly cross-origin isolated', async ({ page }) => {
  test.skip(!publicPdfBase, 'Set PUBLIC_PDF_BASE_URL to exercise the real public edge route.');

  const response = await page.goto(new URL('/txt-to-pdf.html', publicPdfBase).toString(), {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  expect(response, 'BentoPDF navigation returned no main-document response').not.toBeNull();
  expect(response!.status()).toBe(200);
  expect(await response!.headerValue('cf-mitigated')).toBeNull();

  const responseHeaders = await response!.headersArray();
  const values = (name: string) => responseHeaders
    .filter((header) => header.name.toLowerCase() === name.toLowerCase())
    .map((header) => header.value.trim().toLowerCase());

  expect.soft({
    coop: values('Cross-Origin-Opener-Policy'),
    coep: values('Cross-Origin-Embedder-Policy'),
  }, 'COOP and COEP must each occur exactly once; duplicates or conflicts invalidate isolation').toEqual({
    coop: ['same-origin'],
    coep: ['require-corp'],
  });
  expect.soft(values('Content-Security-Policy'), 'BentoPDF must retain exactly one upstream CSP').toHaveLength(1);

  expect.soft(await page.evaluate(() => ({
    secureContext: window.isSecureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    sharedArrayBuffer: typeof SharedArrayBuffer,
  })), 'Chromium must actually accept the isolation policy').toEqual({
    secureContext: true,
    crossOriginIsolated: true,
    sharedArrayBuffer: 'function',
  });

  await page.getByRole('button', { name: 'Type Text', exact: true }).click();
  await page.locator('#text-input').fill('Utilibre public BentoPDF operation check.');
  const downloadPromise = page.waitForEvent('download', { timeout: 60_000 });
  await page.getByRole('button', { name: 'Create PDF', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath, 'text-to-PDF produced no downloadable file').toBeTruthy();
  const bytes = await readFile(downloadPath!);
  expect(bytes.subarray(0, 5).toString(), 'download does not have a PDF signature').toBe('%PDF-');
  expect(bytes.length).toBeGreaterThan(1_000);
});

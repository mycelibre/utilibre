import { expect, test } from '@playwright/test';

test('task guides preserve language, launch access, anchors and usable mobile layout', async ({ page }) => {
  await page.route('**/_portal/config', (route) => route.fulfill({ json: {
    projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.org', defaultLanguage: 'en',
    publicPdfUrl: 'https://pdf.utility.test/', publicQrToolsUrl: 'https://qrtools.utility.test/', publicQrUrl: 'https://qr.utility.test/',
    enabledServices: ['bentopdf', 'qr-offline', 'miniqr'], listedServices: [],
  } }));
  await page.goto('/en/');
  await page.getByRole('link', { name: 'PDF & OCR guide', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/pdf-tools$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Merge PDFs or recognize scanned text');
  await page.getByRole('navigation', { name: 'Choose language' }).getByRole('link', { name: 'ES', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/herramientas-pdf$/);
  await expect(page.locator('.guide-actions a').first()).toHaveAttribute('href', 'https://pdf.utility.test/es/merge-pdf.html');
  await expect(page.locator('.guide-actions a').first()).toHaveAttribute('target', '_blank');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const pendingDownload = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Descargar ejemplo A (PDF)' }).click();
  expect((await pendingDownload).suggestedFilename()).toBe('pdf-es-a.pdf');
  await page.goto('/es/herramientas-pdf#ocr');
  await expect(page.locator('#ocr')).toBeInViewport();
  await page.getByRole('link', { name: 'Ayuda para códigos QR', exact: true }).click();
  await expect(page.locator('.guide-actions a').first()).toHaveAttribute('href', 'https://qrtools.utility.test/?lang=es');
  await expect(page.locator('#main-content')).toContainText('No cifra esos datos');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  // Native text fragments must not be swallowed by the SPA click handler.
  const intercepted = await page.evaluate(() => {
    const anchor = document.createElement('a');
    anchor.href = `${location.pathname}#:~:text=Wi-Fi`;
    document.body.append(anchor);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.dispatchEvent(event);
    anchor.remove();
    return event.defaultPrevented;
  });
  expect(intercepted).toBe(false);
});

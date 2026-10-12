import { expect, test } from '@playwright/test';
const config = {
  projectName: 'Utilibre', defaultLanguage: 'en', supportUrl: '',
  publicPdfUrl: 'https://pdf.utility.test/', publicRssUrl: 'https://rss.utility.test/',
  publicPasteUrl: 'https://paste.utility.test/', publicQrToolsUrl: 'https://qr.utility.test/',
  enabledServices: ['bentopdf', 'freshrss', 'privatebin', 'qr-offline'],
};
for (const language of ['en', 'es']) {
  test(`${language}: live search keeps focus, filters locally and preserves navigation`, async ({ page }) => {
    await page.route('**/_portal/config', route => route.fulfill({ json: config }));
    await page.goto(`/${language}/?group=reading&view=all`);
    await expect(page.locator('.theme-toggle')).toBeEnabled();
    const field = page.locator('#catalog-query');
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    const historyLength = await page.evaluate(() => history.length);
    await field.focus(); await field.fill('pdf');
    await expect(page.locator('[data-catalog-id="bentopdf"]')).toBeVisible();
    await expect(field).toBeFocused();
    await expect(page.locator('.task-navigation [aria-current]')).toHaveCount(0);
    await expect(page.locator('.catalog-views [aria-current]')).toHaveText(language === 'es' ? 'Todas las tareas' : 'All tasks');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('pdf');
    expect(new URL(page.url()).searchParams.has('group')).toBe(false);
    await expect(page.locator('.language-switch a').last()).toHaveAttribute('href', /q=pdf/);
    await field.fill('a-query-with-no-matching-tool');
    await expect(page.locator('.catalog-ledger-row')).toHaveCount(0);
    await expect(page.locator('.catalog-result-count')).toContainText('0');
    await field.fill('');
    await expect(page.locator('[data-catalog-id="bentopdf"]')).toBeVisible();
    await expect(page.locator('[data-catalog-id="privatebin"]')).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await field.fill('qr'); await field.press('Enter');
    await expect(page).toHaveURL(/q=qr/);
    await expect(page.locator('[data-catalog-id="qr-offline"]')).toBeVisible();
    await page.locator('.catalog-clear').click();
    await expect(field).toHaveValue('');
    await page.goBack();
    await expect(field).toHaveValue('qr');
    await expect(page.locator('[data-catalog-id="qr-offline"]')).toBeVisible();
  });
}
test('composition waits for completed text and rapid edits use the latest query', async ({ page }) => {
  await page.route('**/_portal/config', route => route.fulfill({ json: config }));
  await page.goto('/en/?q=qr&view=all');
  await expect(page.locator('.theme-toggle')).toBeEnabled();
  const field = page.locator('#catalog-query');
  await field.evaluate((input: HTMLInputElement) => {
    input.dispatchEvent(new CompositionEvent('compositionstart'));
    input.value = 'pdf'; input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
  });
  await expect(page.locator('[data-catalog-id="qr-offline"]')).toBeVisible();
  await field.dispatchEvent('compositionend');
  await expect(page.locator('[data-catalog-id="bentopdf"]')).toBeVisible();
  await field.fill('unmatched'); await field.fill('privatebin');
  await expect(page.locator('[data-catalog-id="privatebin"]')).toBeVisible();
  await expect(page.locator('[data-catalog-id="bentopdf"]')).toHaveCount(0);
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('privatebin');
});

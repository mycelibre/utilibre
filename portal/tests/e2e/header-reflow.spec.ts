import { expect, test } from '@playwright/test';

for (const language of ['en', 'es']) {
  test(`navigation reflows with enlarged ${language} text without losing controls`, async ({ page }) => {
    for (const width of [1280, 960, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(language === 'es' ? '/es/guias' : '/en/guides');
      await expect(page.locator('.site-header')).toHaveAttribute('data-interactive', 'true');
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.evaluate(() => document.fonts.ready);
      const toggle = page.locator('.menu-toggle');
      await expect(toggle).toBeVisible();
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      const links = page.locator('.main-nav a');
      await expect(links).toHaveCount(5);
      for (const link of await links.all()) {
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      }
      await expect(page.locator('.language-switch a[lang="en"]')).toBeVisible();
      await expect(page.locator('.language-switch a[lang="es"]')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  });
}

test('enlarged navigation remains usable without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
  try {
    const page = await context.newPage();
    await page.goto('/es/guias');
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    for (const link of await page.locator('.main-nav a').all()) await expect(link).toBeVisible();
    await expect(page.locator('.menu-toggle')).toBeHidden();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('.main-nav a').last().click();
    await expect(page).toHaveURL(/\/es\/estado$/);
  } finally { await context.close(); }
});

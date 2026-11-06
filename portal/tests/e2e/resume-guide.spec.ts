import { expect, test } from '@playwright/test';
import { catalog } from '../../src/catalog/catalog';

for (const language of ['es', 'en'] as const) {
  test(`${language}: CV guide exposes real examples and the matching builder without storing a draft`, async ({ page, request }, testInfo) => {
    await page.route('**/_portal/config', route => route.fulfill({ json: {
      ...Object.fromEntries(catalog.filter(entry => entry.configUrlKey).map(entry => [entry.configUrlKey!, `https://${entry.providerId}.example.test/`])),
      projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.example.test', defaultLanguage: 'es',
      enabledServices: [...new Set(catalog.map(entry => entry.serviceId ?? entry.id))], listedServices: [],
      supportUrl: '', contactUrl: '', sourceCodeUrl: '',
    } }));
    const path = language === 'es' ? '/es/guias/curriculum-local' : '/en/guides/local-resume';
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page).toHaveTitle(language === 'es' ? 'Currículum vitae gratis en PDF para Guatemala | Utilibre' : 'Free PDF résumé builder and examples for Guatemala | Utilibre');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://utilibre.example.test' + path);
    const action = page.locator('header.page-header .guide-actions a').first();
    await expect(action).toHaveAttribute('href', `https://openresume.example.test/${language === 'es' ? 'es/' : ''}resume-builder`);
    await expect(action).toHaveAttribute('target', '_blank');
    await expect(page.locator('#cv-examples > section')).toHaveCount(3);
    for (const a of await page.locator('#cv-examples a[download]').all()) {
      const href = await a.getAttribute('href');
      const response = await request.get(href!); expect(response.status()).toBe(200);
      if (href!.endsWith('.pdf')) expect((await response.body()).subarray(0, 5).toString()).toBe('%PDF-');
      else expect(await response.text()).toContain(language === 'es' ? 'PERFIL FICTICIO' : 'FICTIONAL PROFILE');
    }
    await page.locator('#cv-examples details').first().locator('summary').click();
    await expect(page.locator('#cv-examples details').first()).toContainText(language === 'es' ? 'María Ejemplo' : 'María Example');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => localStorage.getItem('open-resume-state'))).toBeNull();
    await page.screenshot({path: testInfo.outputPath('cv-guide.png'), fullPage: true});
    await page.getByRole('navigation', {name: language === 'es' ? 'Elegir idioma' : 'Choose language'}).getByRole('link', {name: language === 'es' ? 'EN' : 'ES', exact: true}).click();
    await expect(page).toHaveURL(new RegExp(language === 'es' ? '/en/guides/local-resume$' : '/es/guias/curriculum-local$'));
  });
}

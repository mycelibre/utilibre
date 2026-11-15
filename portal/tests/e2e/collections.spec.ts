import { featuredGuideIds } from '../../src/pages/guide-discovery';
import { expect, test } from '@playwright/test';
import { catalog } from '../../src/catalog/catalog';
import { scenarioCollections, collectionPath } from '../../src/pages/scenario-collection-data';
import { practicalGuides } from '../../src/pages/practical-guide-data';

test.beforeEach(async ({ page }) => {
  await page.route('**/_portal/config', route => route.fulfill({ json: {
    ...Object.fromEntries(catalog.filter(entry => entry.configUrlKey).map(entry => [entry.configUrlKey!, `https://${entry.providerId}.example.test/`])),
    projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.example.test', defaultLanguage: 'es',
    enabledServices: [...new Set(catalog.map(entry => entry.serviceId ?? entry.id))], listedServices: [],
    supportUrl: 'https://liberapay.com/mycelibre/donate', contactUrl: '', sourceCodeUrl: '',
  } }));
});

test('six localized collections can be saved deliberately without replacing existing work', async ({ page }) => {
  for (const language of ['en', 'es'] as const) for (const collection of scenarioCollections) {
    await page.goto(collectionPath(collection.id, language));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(collection.title[language]);
    await expect(page.locator('.collection-tools-list > li')).toHaveCount(collection.tools.length);
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://utilibre.example.test' + collectionPath(collection.id, language));
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    const before = await page.evaluate(() => localStorage.getItem('portal.toolkits.v1'));
    await page.locator('header.page-header a[href*="#collection="]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.toolkit-shared')).toContainText(collection.title[language]);
    expect(await page.evaluate(() => localStorage.getItem('portal.toolkits.v1'))).toBe(before);
    await page.getByRole('button', { name: language === 'es' ? 'Guardar una copia en mis colecciones' : 'Save a copy to my collections', exact: true }).click();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('portal.toolkits.v1')!));
    expect(saved.collections.at(-1).tools).toEqual(collection.tools.map(tool => tool.id));
  }
});

test('guide search stays local and sample downloads preserve the guide', async ({ page }) => {
  await page.goto('/es/guias');
  await expect(page.locator('.guide-featured-list li')).toHaveCount(featuredGuideIds.length);
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  const input = page.getByLabel('Buscá una guía');
  await input.fill('escáner');
  await expect(page.locator('.guide-index li:visible')).toHaveCount(1);
  await expect(page.locator('.guide-index li:visible')).toHaveAttribute('data-guide-id', 'scan');
  await input.fill('nothingmatchesxyz');
  await expect(page.getByRole('status')).toContainText('Sin resultados');
  await page.getByRole('button', { name: 'Borrar búsqueda' }).click();
  await expect(input).toBeFocused();
  await expect(page.locator('.guide-index li:visible')).toHaveCount(practicalGuides.length);
  expect(requests).toEqual([]); expect(new URL(page.url()).search).toBe('');
  await page.locator('.guide-featured-list a').first().click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#practice a[download]').first().click()]);
  expect(download.suggestedFilename()).toBe('scan-es.pdf'); expect(await download.failure()).toBeNull();
  await expect(page.locator('#steps')).toContainText('Paso a paso');
  await expect(page.locator('.guide-actions a').first()).toHaveAttribute('target', '_blank');
  await page.getByRole('navigation', { name: 'Elegir idioma' }).getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/guides\/scanned-documents$/);
  await expect(page.locator('#practice')).toContainText('Start with the example');
});

test('copy fallback and voluntary support need neither tracking nor funding pressure', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }));
  await page.goto('/en/collections/study-and-presentations');
  await expect(page.getByLabel('Collection link', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: 'Copy this page’s link' }).click();
  await expect(page.getByLabel('Collection link', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Collection link', { exact: true })).toHaveValue('https://utilibre.example.test/en/collections/study-and-presentations');
  await expect(page.getByLabel('Collection link', { exact: true })).toBeFocused();
  for (const path of ['/en/support', '/es/apoyar']) {
    await page.goto(path);
    await expect(page.locator('.funding-details')).not.toHaveAttribute('open');
    await expect(page.locator('main')).not.toContainText('$0');
    await expect(page.locator('.hero-lead')).toContainText(path.startsWith('/es') ? 'proyecto voluntario' : 'voluntary project');
    await page.locator('.funding-details summary').click();
    await expect(page.locator('#funding')).toContainText('$300');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
});

test('document journeys offer private failure reporting without sending task state', async ({ page, context }) => {
  for (const path of ['/es/colecciones/documentos-y-tramites', '/en/collections/documents-and-applications', '/es/guias/preparar-imagen', '/en/guides/file-transfer', '/en/pdf-tools']) {
    await page.goto(path);
    const report = page.locator('#problem-report');
    await expect(report.getByRole('link')).toHaveAttribute('href', 'https://liberaforms.example.test/feedback');
    await expect(report.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  const requests: { url: string; method: string; referer: string | undefined }[] = [];
  await context.route('https://liberaforms.example.test/**', route => {
    requests.push({ url: route.request().url(), method: route.request().method(), referer: route.request().headers().referer });
    return route.fulfill({ contentType: 'text/html', body: '<title>Controlled feedback destination</title>' });
  });
  const popup = context.waitForEvent('page');
  await page.locator('#problem-report a').click();
  await (await popup).waitForLoadState();
  expect(requests).toEqual([{ url: 'https://liberaforms.example.test/feedback', method: 'GET', referer: undefined }]);
  await expect(page).toHaveURL(/\/en\/pdf-tools$/);
});

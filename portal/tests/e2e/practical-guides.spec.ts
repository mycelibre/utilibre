import { expect, test } from '@playwright/test';
import { practicalGuides, practicalGuidePath } from '../../src/pages/practical-guide-data';

test('all practical guides preserve language, real launch paths and downloadable fixtures', async ({ page }) => {
  await page.route('**/_portal/config', route => route.fulfill({ json: {
    projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.org', defaultLanguage: 'en',
    publicPdfUrl: 'https://pdf.example/', publicToolsUrl: 'https://tools.example/', publicPaintUrl: 'https://paint.example/',
    publicChartsUrl: 'https://charts.example/', publicScrubUrl: 'https://scrub.example/', publicDropUrl: 'https://drop.example/',
    publicMindmapUrl: 'https://mindmap.example/',
    publicRedditUrl: 'https://redlib.example/',
    publicDrawUrl: 'https://draw.example/', publicWhiteboardUrl: 'https://whiteboard.example/',
    publicPasteUrl: 'https://paste.example/', publicEncryptUrl: 'https://encrypt.example/', publicPollarisUrl: 'https://pollaris.example/', publicPollUrl: 'https://poll.example/',
    enabledServices: ['redlib', 'drawio', 'excalidraw', 'markmap', 'bentopdf', 'omnitools', 'minipaint', 'rawgraphs', 'image-scrubber', 'pairdrop', 'privatebin', 'hatsh', 'pollaris', 'rallly'], listedServices: [],
  } }));
  for (const guide of practicalGuides) {
    await page.goto(practicalGuidePath(guide.id, 'en'));
    await expect(page.locator('main ol li').first()).toBeVisible();
    await expect(page.locator('.guide-actions a')).toHaveCount(guide.tools.length + (guide.portalLinks?.length || 0));
    for (const a of await page.locator('.guide-actions a[target=_blank]').all()) { await expect(a).toHaveAttribute('rel', 'noopener noreferrer'); expect(await a.getAttribute('href')).toMatch(/^(https:\/\/[^/]+\.example\/|\/en\/tools\/)/); }
    await page.getByRole('navigation', { name: 'Choose language' }).getByRole('link', { name: 'ES', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(practicalGuidePath(guide.id, 'es') + '$'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    for (const a of await page.locator('main a[download]').all()) {
      const pending = page.waitForEvent('download'); await a.click(); const file = await pending; expect(await file.failure()).toBeNull();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('main')).toHaveCSS('color', 'rgb(44, 44, 42)');
  await expect(page.locator('.hero-lead')).toHaveCSS('color', 'rgb(83, 96, 87)');
});

test('pilot and account views remain explicit, searchable and bookmarkable', async ({ page }) => {
  await page.route('**/_portal/config', route => route.fulfill({ json: {
    projectName: 'Utilibre', defaultLanguage: 'en', publicFmdUrl: 'https://fmd.example/', publicPollUrl: 'https://poll.example/',
    publicRssUrl: 'https://rss.example/', publicPollarisUrl: 'https://pollaris.example/', publicStatusUrl: 'https://status.example/',
    enabledServices: ['fmd', 'rallly', 'freshrss', 'pollaris', 'uptime-kuma'], listedServices: [],
  } }));
  await page.goto('/en/'); await expect(page.locator('[data-catalog-id]')).toHaveCount(1);
  await page.locator('.catalog-views').getByRole('link', { name: 'Accounts & sign-in', exact: true }).click();
  await expect(page.locator('[data-catalog-id="rallly"]')).toContainText('Vote: no account');
  await expect(page.locator('[data-catalog-id="freshrss"] a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('[data-catalog-id="fmd"]')).toHaveCount(0);
  await page.locator('.catalog-views').getByRole('link', { name: 'Pilots & unavailable', exact: true }).click();
  await expect(page.locator('[data-catalog-id="fmd"]')).toContainText('Real-device testing pending');
  await expect(page.locator('[data-catalog-id="fmd"] .catalog-ledger-launch')).toHaveAttribute('href', 'https://fmd.example/');
  await page.reload(); await expect(page.locator('[data-catalog-id]')).toHaveCount(1);
  await expect(page.locator('[data-catalog-id="uptime-kuma"]')).toHaveCount(0);
  await page.getByLabel('Search tools').fill('nothingmatches'); await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.catalog-result-count')).toContainText('0');
  await expect(page.locator('.catalog-ledger-empty')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBe('pilots');
});

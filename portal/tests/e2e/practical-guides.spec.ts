import { catalogEntry } from '../../src/catalog/catalog';
import { expect, test } from '@playwright/test';
import { practicalGuides, practicalGuidePath } from '../../src/pages/practical-guide-data';

test('all practical guides preserve language, real launch paths and downloadable fixtures', async ({ page }) => {
  // The complete bilingual registry grows with guides; navigation assertions keep their default timeout.
  test.setTimeout(60_000);
  await page.route('**/_portal/config', route => route.fulfill({ json: {
    projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.org', defaultLanguage: 'en',
    publicPdfUrl: 'https://pdf.example/', publicToolsUrl: 'https://tools.example/', publicPaintUrl: 'https://paint.example/',
    publicChartsUrl: 'https://charts.example/', publicScrubUrl: 'https://scrub.example/', publicDropUrl: 'https://drop.example/',
    publicMindmapUrl: 'https://mindmap.example/', publicDeveloperToolsUrl: 'https://dev.example/', publicCyberchefUrl: 'https://chef.example/',
    publicMapsUrl: 'https://maps.example/', publicCalcUrl: 'https://calc.example/',
    publicPlanUrl: 'https://plan.example/', publicRssUrl: 'https://rss.example/',
    publicPadUrl: 'https://pad.example/', publicFormsUrl: 'https://forms.example/', publicMeetUrl: 'https://meet.example/',
    publicExpensesUrl: 'https://expenses.example/', publicWishlistUrl: 'https://wishlist.example/', publicKitchenUrl: 'https://kitchen.example/',
    publicSnippetsUrl: 'https://snippets.example/', publicBookmarksUrl: 'https://bookmarks.example/', publicTasksUrl: 'https://tasks.example/',
    publicSnippetLibraryUrl: 'https://snippets-library.example/', publicLocalResumeUrl: 'https://resume-builder.example/',
    publicTripUrl: 'https://trip.example/', publicDonetickUrl: 'https://chores.example/', publicBeaverHabitsUrl: 'https://habits.example/', publicChessUrl: 'https://chess.example/', publicProjectsUrl: 'https://projects.example/', publicNewslettersUrl: 'https://newsletters.example/', publicAliasesUrl: 'https://aliases.example/', publicQuizUrl: 'https://quiz.example/', publicLinksUrl: 'https://links.example/',
    publicExpandUrl: 'https://expand.example/', publicReaderUrl: 'https://read.example/',
    publicCalendarUrl: 'https://calendar.example/', publicChatUrl: 'https://chat.example/', publicEventsUrl: 'https://events.example/',
    publicRedditUrl: 'https://redlib.example/',
    publicDrawUrl: 'https://draw.example/', publicWhiteboardUrl: 'https://whiteboard.example/', publicCollabUrl: 'https://collab.example/',
    publicPasteUrl: 'https://paste.example/', publicEncryptUrl: 'https://encrypt.example/', publicPollarisUrl: 'https://pollaris.example/', publicPollUrl: 'https://poll.example/',
    enabledServices: ['trip', 'donetick', 'beaverhabits', 'projects', 'kokoro-web', 'family-chess', 'knit', 'newton', 'rustpad', 'autoredact', 'gravity', 'one-file-core', 'tiddlywiki', 'moocup', 'newsletters', 'addy', 'unfurl', '13ft', 'razzia', 'chhoto', 'calino', 'radicale', 'chitchatter', 'gathio', 'link-cleaner', 'drawdb', 'bookbinder', 'moodist', 'chartdb', 'sketchforge', 'spliit', 'wishlist', 'kitchenowl', 'opengist', 'linkding', 'vikunja', 'bytestash', 'openresume', 'ittools', 'cyberchef', 'cryptpad', 'liberaforms', 'galene', 'super-productivity', 'freshrss', 'mapshaper', 'numbat', 'wbo', 'redlib', 'drawio', 'excalidraw', 'markmap', 'bentopdf', 'omnitools', 'minipaint', 'rawgraphs', 'image-scrubber', 'pairdrop', 'privatebin', 'hatsh', 'pollaris', 'rallly'], listedServices: [],
  } }));
  for (const guide of practicalGuides) {
    await page.goto(practicalGuidePath(guide.id, 'en'));
    await expect(page.locator('main ol li').first()).toBeVisible();
    const unavailable = guide.tools.filter(tool => ['not-deployed', 'maintenance', 'unavailable'].includes(catalogEntry(tool.id)!.operationalStatus));
    await expect(page.locator('.guide-actions a')).toHaveCount(guide.tools.length - unavailable.length + (guide.portalLinks?.length || 0));
    await expect(page.locator('.guide-actions .notice')).toHaveCount(unavailable.length);
    if (guide.id === 'small-meeting') await expect(page.locator('.guide-actions a[target=_blank]')).toHaveAttribute('href', 'https://meet.example/group/community/');
    for (const a of await page.locator('.guide-actions a[target=_blank]').all()) { await expect(a).toHaveAttribute('rel', 'noopener noreferrer'); expect(await a.getAttribute('href')).toMatch(/^(https:\/\/[^/]+\.example\/|\/en\/tools\/)/); }
    await page.getByRole('navigation', { name: 'Choose language' }).getByRole('link', { name: 'ES', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(practicalGuidePath(guide.id, 'es') + '$'));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    if (guide.id === 'small-meeting') await expect(page.locator('.guide-actions a[target=_blank]')).toHaveAttribute('href', 'https://meet.example/group/community/');
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
    projectName: 'Utilibre', defaultLanguage: 'en', publicFmdUrl: 'https://fmd.example/', publicPollUrl: 'https://poll.example/', publicAliasesUrl: 'https://aliases.example/',
    publicRssUrl: 'https://rss.example/', publicPollarisUrl: 'https://pollaris.example/', publicStatusUrl: 'https://status.example/', publicMeetUrl: 'https://meet.example/',
    enabledServices: ['addy', 'fmd', 'galene', 'rallly', 'freshrss', 'pollaris', 'uptime-kuma'], listedServices: ['breezewiki'],
  } }));
  await page.goto('/en/'); await expect(page.locator('[data-catalog-id]')).toHaveCount(1);
  await page.locator('.catalog-views').getByRole('link', { name: 'Accounts & sign-in', exact: true }).click();
  await expect(page.locator('[data-catalog-id="rallly"]')).toContainText('Vote: no account');
  const addy = page.locator('[data-catalog-id="addy"]');
  await expect(addy).toContainText('Existing accounts only');
  await expect(addy).toContainText('separate addy.io account');
  await expect(addy).not.toContainText('48 hours');
  await expect(addy.locator('.catalog-ledger-launch')).toHaveAttribute('href', 'https://aliases.example/');
  await expect(addy.locator('a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('[data-catalog-id="freshrss"] a[href^="mailto:"]')).toHaveCount(0);
  await expect(page.locator('[data-catalog-id="fmd"]')).toContainText('Invitation-only account');
  await expect(page.locator('[data-catalog-id="fmd"] .catalog-ledger-launch')).toHaveAttribute('href', 'https://fmd.example/');
  await expect(page.locator('[data-catalog-id="galene"] .catalog-ledger-launch')).toHaveAttribute('href', 'https://meet.example/group/community/');
  await expect(page.locator('[data-catalog-id="fmd"] a[href^="mailto:"]')).toBeVisible();
  await expect(page.locator('[data-catalog-id="galene"] a[href^="mailto:"]')).toHaveText('Request hosting access');
  const request = new URL((await page.locator('[data-catalog-id="fmd"] a[href^="mailto:"]').getAttribute('href'))!);
  expect(request.searchParams.get('subject')).toContain('FMD');
  expect(request.searchParams.get('body')).toContain('Do I already have a Utilibre account?');
  await page.locator('[data-catalog-id="fmd"] .catalog-help summary').click();
  await expect(page.locator('[data-catalog-id="fmd"]')).toContainText('Real Android and push delivery were not tested');
  await expect(page.locator('[data-catalog-id="fmd"] .catalog-help')).toContainText('separate from Utilibre login');
  await page.locator('.catalog-views').getByRole('link', { name: 'Pilots & unavailable', exact: true }).click();
  for (const id of ['fmd', 'galene']) await expect(page.locator(`[data-catalog-id="${id}"]`)).toHaveCount(0);
  await expect(page.locator('[data-catalog-id="breezewiki"]')).toBeVisible();
  await page.reload(); await expect(page.locator('[data-catalog-id]')).toHaveCount(1);
  await expect(page.locator('[data-catalog-id="uptime-kuma"]')).toHaveCount(0);
  await page.getByLabel('Search tools').fill('nothingmatches'); await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.catalog-result-count')).toContainText('0');
  await expect(page.locator('.catalog-ledger-empty')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('view')).toBe('all');
});

test('Collab belongs to Use now and keeps its storage and privacy limits', async ({ page }) => {
  await page.route('**/_portal/config', route => route.fulfill({ json: {
    projectName: 'Utilibre', defaultLanguage: 'en', publicCollabUrl: 'https://collab.example/',
    enabledServices: ['wbo'], listedServices: [],
  } }));
  for (const language of ['en', 'es']) {
    await page.goto(`/${language}/`);
    await expect(page.locator('[data-catalog-id="wbo"]')).toHaveCount(0);
    await page.locator('#catalog-query').fill('Collab');
    await page.locator('.catalog-search button').click();
    expect(new URL(page.url()).searchParams.get('view')).toBe('all');
    const board = page.locator('[data-catalog-id="wbo"]');
    await expect(board).toContainText('Collab (WBO)');
    await expect(board).toContainText(language === 'en' ? 'The server can read these temporary drawings' : 'El servidor puede leer estos dibujos temporales');
    await expect(board).not.toContainText(/pilot|piloto/i);
    await expect(board.locator('.catalog-ledger-launch')).toHaveAttribute('href', `https://collab.example/?lang=${language}`);
    await expect(page.locator('.catalog-mode-link[aria-current="page"]')).toHaveText(language === 'en' ? 'All tasks' : 'Todas las tareas');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.goto(`/${language}/?q=Collab`);
    await expect(page.locator('[data-catalog-id="wbo"]')).toBeVisible();
    await page.goto(`/${language}/?view=public&q=Collab`);
    await expect(page.locator('[data-catalog-id="wbo"]')).toBeVisible();
    await page.goto(`/${language}/?view=pilots&q=Collab`);
    await expect(page.locator('[data-catalog-id="wbo"]')).toHaveCount(0);
  }
});

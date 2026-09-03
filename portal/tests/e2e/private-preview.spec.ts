import { expect, test } from '@playwright/test';

const preview = process.env.PRIVATE_PREVIEW_BASE_URL;
const previewSearch = process.env.PRIVATE_PREVIEW_SEARCH_URL;
const previewReddit = process.env.PRIVATE_PREVIEW_REDDIT_URL;
const publicPortal = process.env.PUBLIC_PORTAL_BASE_URL;

test('public portal loads its catalog outside an edge-reserved API namespace', async ({ page, request }) => {
  test.skip(!publicPortal, 'Set PUBLIC_PORTAL_BASE_URL to exercise the public edge route.');

  const config = await request.get(`${publicPortal}/_portal/config`);
  expect(config.status()).toBe(200);
  expect(config.headers()['content-type']).toContain('application/json');

  await page.goto(`${publicPortal}/en/?view=all`);
  await expect(page.getByText('No private-service hostnames are configured yet.', { exact: false })).toHaveCount(0);
  const deployed = [
    ['ntfy', 'Push notifications'],
    ['bentopdf', 'PDF tools'],
    ['vert', 'File converter'],
    ['omnitools', 'Everyday tools'],
    ['healthchecks', 'Cron monitoring'],
    ['pairdrop', 'Send files'],
    ['freshrss', 'RSS reader'],
    ['rsshub', 'RSS generator'],
    ['privatebin', 'Encrypted paste'],
    ['wakapi', 'Coding statistics'],
  ] as const;
  for (const [id, name] of deployed) {
    const row = page.locator(`[data-catalog-id="${id}"]`);
    await expect(row.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(row.getByRole('link', { name: `Open: ${name}` })).toBeVisible();
  }
  const serviceLinks = await page.locator('[data-catalog-id] a[href^="http"]').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href));
  expect(serviceLinks.some((href) => /^http:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(href))).toBe(false);
});

test('direct private HTTP preview keeps UUID and SHA-2 tools local and functional', async ({ page }) => {
  test.skip(!preview, 'Set PRIVATE_PREVIEW_BASE_URL to exercise the live private HTTP deployment.');

  await page.goto(`${preview}/en/tools/uuid`);
  await expect(page.locator('.tool-panel')).toBeVisible();
  expect(await page.evaluate(() => window.isSecureContext)).toBe(false);
  await expect(page.getByLabel('Output')).toHaveValue(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  await page.getByRole('button', { name: 'Copy' }).click();
  await expect(page.getByRole('status')).toContainText('Copied');

  await page.goto(`${preview}/en/tools/file-hashes`);
  await expect(page.locator('.tool-panel')).toBeVisible();
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.locator('input[type=file]').setInputFiles({ name: 'abc.txt', mimeType: 'text/plain', buffer: Buffer.from('abc') });
  await page.getByRole('button', { name: 'Calculate hashes' }).click();
  await expect(page.getByRole('status')).toContainText('Done');
  await expect(page.locator('dd').first()).toHaveText('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  await expect(page.locator('dd').nth(1)).toHaveText('ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f');
  expect(requests).toEqual([]);

  await page.goto(`${preview}/en/software`);
  await expect(page.getByRole('heading', { name: '@noble/hashes' })).toBeVisible();
});

test('direct private SearXNG preview returns an actual result list', async ({ page }) => {
  test.skip(!previewSearch, 'Set PRIVATE_PREVIEW_SEARCH_URL to exercise live private SearXNG.');
  await page.goto(`${previewSearch}/`);
  await expect(page.locator('form#search')).toBeVisible();
  await page.locator('input[name=q]').fill('example domain');
  const navigation = page.waitForNavigation();
  await page.locator('button[type=submit]').click();
  const response = await navigation;
  expect(response?.status()).toBe(200);
  await expect(page.locator('body')).not.toContainText('Too Many Requests');
  await expect(page.locator('body')).not.toContainText('No results were found');
  await expect(page.locator('article.result').first()).toBeVisible();
});

test('direct private Redlib preview returns posts and keeps settings redirects local', async ({ request }) => {
  test.skip(!previewReddit, 'Set PRIVATE_PREVIEW_REDDIT_URL to exercise live private Redlib.');

  const listing = await request.get(`${previewReddit}/r/privacy`);
  expect(listing.status()).toBe(200);
  const listingBody = await listing.text();
  expect(listingBody).toContain('class="post');
  expect(listingBody).not.toContain('Too many requests');

  const robots = await request.get(`${previewReddit}/robots.txt`);
  expect(await robots.text()).toContain('Disallow: /');

  const crawler = await request.get(`${previewReddit}/`, { headers: { 'User-Agent': 'GPTBot' } });
  expect(crawler.status()).toBe(403);

  const redirect = await request.get(`${previewReddit}/settings/update?redirect=%2F%2Fevil.example`, { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  expect(redirect.headers().location).toBe('/');
});

test('live private portal exposes Redlib without turning the URL router into an open redirect', async ({ page }) => {
  test.skip(!preview || !previewReddit, 'Set the private portal and Redlib URLs to exercise their live integration.');
  const redlibBase = new URL(previewReddit as string).toString();

  await page.goto(`${preview}/en/?view=all`);
  const card = page.locator('[data-catalog-id="redlib"]');
  await expect(card).toContainText('SERVER');
  await expect(card.getByRole('link', { name: 'Open: Redlib for Reddit' })).toHaveAttribute('href', redlibBase);

  await page.goto(`${preview}/en/status`);
  const status = page.getByRole('heading', { name: 'Redlib for Reddit', exact: true }).locator('..');
  await expect(status).toContainText('Operational');

  await page.goto(`${preview}/en/tools/open-privately`);
  await page.getByLabel('Supported public URL').fill('https://old.reddit.com/r/privacy?sort=top&redirect=https://evil.example');
  await page.getByRole('button', { name: 'Check URL' }).click();
  const destination = page.locator('.router-result a');
  await expect(destination).toHaveAttribute('href', `${redlibBase}r/privacy?sort=top`);
  await expect(destination).not.toHaveAttribute('href', /evil\.example/);
});

test('live portal on port 8080 links deployed services through public subdomains', async ({ page }) => {
  test.skip(!preview, 'Set PRIVATE_PREVIEW_BASE_URL to exercise the live private HTTP deployment.');
  const expected = [
    ['ntfy', 'Push notifications', 'https://notify.utilibre.org/'],
    ['bentopdf', 'PDF tools', 'https://pdf.utilibre.org/'],
    ['vert', 'File converter', 'https://convert.utilibre.org/'],
    ['omnitools', 'Everyday tools', 'https://tools.utilibre.org/'],
    ['healthchecks', 'Cron monitoring', 'https://monitor.utilibre.org/'],
    ['pairdrop', 'Send files', 'https://send.utilibre.org/'],
    ['freshrss', 'RSS reader', 'https://rss.utilibre.org/'],
    ['rsshub', 'RSS generator', 'https://feeds.utilibre.org/'],
    ['privatebin', 'Encrypted paste', 'https://paste.utilibre.org/'],
    ['wakapi', 'Coding statistics', 'https://wakapi.utilibre.org/'],
  ] as const;

  await page.goto(`${preview}/en/?view=all`);
  for (const [id, name, url] of expected) {
    const card = page.locator(`[data-catalog-id="${id}"]`);
    await expect(card, `${name} should be visible at ${preview}`).toBeVisible();
    await expect(card.getByRole('link', { name: `Open: ${name}` })).toHaveAttribute('href', url);
  }
  await expect(page.getByRole('heading', { name: 'Find a time', exact: true })).toHaveCount(0);
});

test('an open page recovers once when a deployment replaces a lazy tool chunk', async ({ page }) => {
  test.skip(!preview, 'Set PRIVATE_PREVIEW_BASE_URL to exercise the live private HTTP deployment.');

  let intercepted = 0;
  await page.route('**/assets/image-*.js', async (route) => {
    intercepted += 1;
    if (intercepted === 1) await route.abort('failed');
    else await route.continue();
  });
  await page.goto(`${preview}/en/`);
  await page.getByRole('link', { name: 'Open: Resize an image' }).click();
  await expect(page).toHaveURL(/\/en\/tools\/image-resize$/);
  await expect(page.locator('.tool-panel')).toBeVisible();
  expect(intercepted).toBeGreaterThanOrEqual(2);
  expect(await page.evaluate(() => sessionStorage.getItem('portal.stale-chunk-reload'))).toBeNull();
});

import { expect, test, type Page } from '@playwright/test';
import { catalog, localized } from '../../src/catalog/catalog';
import { toolPath } from '../../src/routes';

const featuredIds = ['searxng', 'freshrss', 'redlib', 'privatebin'] as const;

const baseConfig = {
  projectName: 'Utilibre', projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
  sourceCodeUrl: '', supportUrl: '', contactUrl: '', publicSearchUrl: '', publicRedditUrl: '',
  publicRssUrl: '', publicPasteUrl: '',
  enabledServices: [], defaultLanguage: 'en',
} as const;

const featuredConfig = {
  ...baseConfig,
  publicSearchUrl: 'https://search.utility.test/',
  publicRedditUrl: 'https://reddit.utility.test/',
  publicPasteUrl: 'https://paste.utility.test/',
  publicRssUrl: 'https://rss.utility.test/',
  enabledServices: ['searxng', 'redlib', 'freshrss', 'privatebin'],
};

async function mockConfig(page: Page, config: Record<string, unknown>): Promise<void> {
  await page.route('**/_portal/config', async (route) => route.fulfill({ json: config }));
}

function catalogRows(page: Page) {
  return page.locator('.catalog-ledger-row[data-catalog-id]');
}

function languageNavigation(page: Page, name: 'Choose language' | 'Elegir idioma') {
  return page.getByRole('navigation', { name });
}

test('Spanish is complete, preserves tools when switched, and fits a mobile viewport', async ({ page }) => {
  await mockConfig(page, { ...baseConfig, publicRedditUrl: 'https://reddit.utility.test/', enabledServices: ['redlib'] });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/es/herramientas/abrir-con-privacidad');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Abrir un enlace de Reddit con Redlib');
  await expect(page.getByLabel('URL pública compatible')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/\b(undefined|null)\b/);
  await languageNavigation(page, 'Elegir idioma').getByRole('link', { name: 'EN', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/tools\/open-privately$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Open a Reddit link through Redlib');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
});

test('first visit follows Spanish browser preference and manual choice persists locally', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'es-GT' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/es\/$/);
  await languageNavigation(page, 'Elegir idioma').getByRole('link', { name: 'EN', exact: true }).click();
  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/$/);
  await context.close();
});

test('browser language preference uses the first supported language', async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => Object.defineProperty(navigator, 'languages', { configurable: true, get: () => ['en-US', 'es-GT'] }));
  const page = await context.newPage();
  await page.goto('/');
  await expect(page).toHaveURL(/\/en\/$/);
  await context.close();
});

test('default discovery is neutral and retained hosted services follow editorial order', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  await page.goto('/en/');

  await expect(page.locator('.task-navigation a[aria-current="page"]')).toHaveCount(0);
  await expect(page.locator('.ledger-reference-links a[aria-current="page"]')).toHaveText('Hosted services');
  await expect(catalogRows(page)).toHaveCount(featuredIds.length);
  expect(await catalogRows(page).evaluateAll((rows) => rows.map((row) => (row as HTMLElement).dataset.catalogId))).toEqual(featuredIds);
  const launchLinks = page.locator('.catalog-ledger-launch');
  await expect(launchLinks).toHaveCount(featuredIds.length);
  for (const link of await launchLinks.all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('aria-label', /opens in a new tab/);
    await expect(link.locator('.catalog-ledger-external-cue')).toHaveText('↗');
  }
  await expect(page.locator('[data-catalog-id="searxng"]').getByRole('link', { name: 'Upstream source: SearXNG' }))
    .toHaveAttribute('href', 'https://github.com/searxng/searxng');
});

test('task selection activates one category and Spanish search crosses categories without diacritics', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  await page.goto('/es/');
  await expect(page.locator('.task-navigation a[aria-current="page"]')).toHaveCount(0);

  await page.getByRole('navigation', { name: 'Explorar por tarea' }).getByRole('link', { name: /Fuentes RSS/ }).click();
  await expect(page).toHaveURL(/\/es\/\?group=feeds-monitoring#catalog$/);
  const currentTasks = page.locator('.task-navigation a[aria-current="page"]');
  await expect(currentTasks).toHaveCount(1);
  await expect(currentTasks).toContainText('Fuentes RSS');
  expect(await catalogRows(page).evaluateAll((rows) => rows.every((row) => (row as HTMLElement).dataset.discoveryGroup === 'feeds-monitoring'))).toBe(true);

  await page.getByLabel('Buscar herramientas').fill('busqueda');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/\?q=busqueda$/);
  await expect(page.locator('.task-navigation a[aria-current="page"]')).toHaveCount(0);
  await expect(catalogRows(page)).toHaveCount(1);
  await expect(page.locator('.catalog-ledger-row[data-catalog-id="searxng"]')).toContainText('Búsqueda web');
});

test('language links preserve homepage query state', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  await page.goto('/en/?q=RSS');
  const spanish = languageNavigation(page, 'Choose language').getByRole('link', { name: 'ES', exact: true });
  await expect(spanish).toHaveAttribute('href', /\/es\/\?q=RSS$/);
  await spanish.click();
  await expect(page).toHaveURL(/\/es\/\?q=RSS$/);
  await expect(page.getByRole('searchbox', { name: 'Buscar herramientas' })).toHaveValue('RSS');
});

test('donation surfaces stay hidden without a configured support destination', async ({ page }) => {
  await mockConfig(page, { ...baseConfig, supportUrl: '' });

  await page.goto('/en/');
  await expect(page.getByRole('link', { name: 'How support works' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toHaveCount(0);
  await expect(page.locator('.main-nav a[href="/en/support"], .footer-links a[href="/en/support"]')).toHaveCount(0);
  await expect(page.getByText('Donations help cover hosting and maintenance.')).toHaveCount(0);

  await page.goto('/en/transparency');
  await expect(page.getByRole('heading', { level: 2, name: 'Funding and donations' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Visit the external support page' })).toHaveCount(0);

  for (const [path, heading, catalogPath] of [
    ['/en/support', 'Page not found', '/en/'],
    ['/es/apoyar', 'Página no encontrada', '/es/'],
    ['/es/support', 'Página no encontrada', '/es/'],
  ] as const) {
    const response = await page.goto(path);
    if (process.env.E2E_BASE_URL) expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('link', { name: path.startsWith('/es/') ? 'Volver al catálogo' : 'Return to the catalog' }))
      .toHaveAttribute('href', catalogPath);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${catalogPath}$`));
  }
});

test('configured support destination is explicit and opens separately', async ({ page }) => {
  await mockConfig(page, { ...baseConfig, supportUrl: 'https://support.utility.test/' });

  await page.goto('/en/');
  await expect(page.getByRole('link', { name: 'How support works' })).toHaveAttribute('href', '/en/support');
  await expect(page.locator('.main-nav a[href="/en/support"]')).toHaveCount(1);
  await expect(page.locator('.footer-links a[href="/en/support"]')).toHaveCount(1);

  await page.goto('/en/support');
  const englishSupport = page.getByRole('link', { name: 'Visit the external support page' });
  await expect(englishSupport).toHaveAttribute('href', 'https://support.utility.test/');
  await expect(englishSupport).toHaveAttribute('target', '_blank');
  await expect(englishSupport).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(languageNavigation(page, 'Choose language').getByRole('link', { name: 'ES', exact: true }))
    .toHaveAttribute('href', '/es/apoyar');

  await page.goto('/es/apoyar');
  const spanishSupport = page.getByRole('link', { name: 'Visitar la página externa de apoyo' });
  await expect(spanishSupport).toHaveAttribute('href', 'https://support.utility.test/');
  await expect(spanishSupport).toHaveAttribute('target', '_blank');
  await expect(spanishSupport).toHaveAttribute('rel', 'noopener noreferrer');

  await page.goto('/en/transparency');
  await expect(page.getByRole('heading', { level: 2, name: 'Funding and donations' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Visit the external support page' }))
    .toHaveAttribute('href', 'https://support.utility.test/');
});

test('mobile catalog keeps featured and complete-catalog modes available', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/en/');

  const modes = page.locator('.ledger-reference-links');
  await expect(modes.getByRole('link', { name: 'Hosted services' })).toBeVisible();
  const all = modes.getByRole('link', { name: 'Everything hosted, A–Z' });
  await expect(all).toBeVisible();
  await all.click();
  await expect(page).toHaveURL(/\/en\/\?view=all#catalog$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Everything hosted, A–Z' })).toBeVisible();
  const rows = catalogRows(page);
  expect(await rows.count()).toBeGreaterThan(featuredIds.length);
  await expect(rows.locator('.catalog-ledger-launch')).toHaveCount(await rows.count());
  for (const link of await rows.locator('.catalog-ledger-launch').all()) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
});

test('software inventory is grouped and uses descriptive source links', async ({ page }) => {
  await mockConfig(page, { ...featuredConfig, sourceCodeUrl: 'https://github.com/utility/project/tree/revision' });
  await page.goto('/en/software');

  const jump = page.getByRole('navigation', { name: 'Jump to a software group' });
  await expect(jump.getByRole('link')).toHaveCount(5);
  await expect(page.getByRole('heading', { level: 2, name: 'Hosted applications' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Browser assets' })).toBeVisible();
  const searx = page.getByRole('heading', { level: 3, name: 'SearXNG' }).locator('..');
  await expect(searx.getByRole('link', { name: 'Upstream source: SearXNG' })).toHaveAttribute('href', 'https://github.com/searxng/searxng');
  await expect(searx.getByRole('link', { name: 'Source for the local modification: SearXNG' })).toHaveAttribute('href', 'https://github.com/utility/project/tree/revision');

  const hostedHeading = page.getByRole('heading', { level: 2, name: 'Hosted applications' });
  await jump.getByRole('link', { name: 'Hosted applications' }).click();
  await expect(page).toHaveURL(/#software-hosted$/);
  await expect(hostedHeading).toBeFocused();
});

test('unknown and retired routes return a useful localized 404', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  const missing = await page.goto('/en/definitely-not-a-page');
  if (process.env.E2E_BASE_URL) expect(missing?.status()).toBe(404);
  await expect(page).toHaveTitle(/Page not found/);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Return to the catalog' })).toHaveAttribute('href', '/en/');

  for (const removedPath of ['/en/tools/download-media', '/es/herramientas/descargar-contenido']) {
    await page.goto(removedPath);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(removedPath.startsWith('/es/') ? 'Página no encontrada' : 'Page not found');
    await expect(page.locator('[data-catalog-id="cobalt"]')).toHaveCount(0);
  }
});

test('Field Ledger homepage has no horizontal overflow at 375px', async ({ page }) => {
  await mockConfig(page, featuredConfig);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/es/');
  expect(await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))).toEqual({ client: 375, scroll: 375 });
});

test('private router never creates a user-controlled host redirect', async ({ page }) => {
  await page.goto('/en/tools/open-privately');
  await page.getByLabel('Supported public URL').fill('https://youtube.com.evil.example/watch?v=test');
  await page.getByRole('button', { name: 'Check URL' }).click();
  await expect(page.getByRole('status')).toContainText('not from a supported');
  await expect(page.locator('.router-result a')).toHaveCount(0);
});

test('configured Redlib appears across the portal and routes only to its fixed host', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      projectName: 'Public utility', projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
      sourceCodeUrl: '', supportUrl: '', contactUrl: '', publicSearchUrl: 'https://search.utility.test/',
      publicRedditUrl: 'https://reddit.utility.test/redlib/',
      enabledServices: ['searxng', 'redlib'], defaultLanguage: 'en',
    },
  }));
  await page.route('**/_portal/status', async (route) => route.fulfill({
    json: { checkedAt: '2026-08-30T12:00:00.000Z', services: [{ id: 'redlib', status: 'operational' }] },
  }));

  await page.goto('/en/?view=all');
  const homeRow = page.locator('.catalog-ledger-row[data-catalog-id="redlib"]');
  await expect(homeRow).toContainText('SERVER');
  await expect(homeRow.getByRole('link', { name: 'Open: Redlib for Reddit' })).toHaveAttribute('href', 'https://reddit.utility.test/redlib/');

  await page.goto('/en/status');
  const statusItem = page.getByRole('heading', { name: 'Redlib for Reddit', exact: true }).locator('..');
  await expect(statusItem).toContainText('Operational');

  await page.goto('/en/tools/open-privately');
  await page.getByLabel('Supported public URL').fill('https://old.reddit.com/r/privacy/comments/abc/a-title?sort=top&t=week&context=3&redirect=https://evil.example');
  await page.getByRole('button', { name: 'Check URL' }).click();
  const destination = page.locator('.router-result a');
  await expect(destination).toHaveAttribute('href', 'https://reddit.utility.test/redlib/r/privacy/comments/abc/a-title?sort=top&t=week&context=3');
  await expect(destination).not.toHaveAttribute('href', /evil\.example/);

  await page.goto('/es/privacidad');
  await expect(page.getByText('La interfaz de Redlib está solo en inglés.', { exact: false })).toBeVisible();
});

test('only retained Utilibre services appear when stale service IDs are still configured', async ({ page }) => {
  const services = [
    { key: 'publicSearchUrl', id: 'searxng', en: 'Web search', es: 'Búsqueda web', url: 'https://search.utility.test/' },
    { key: 'publicRedditUrl', id: 'redlib', en: 'Redlib for Reddit', es: 'Redlib para Reddit', url: 'https://reddit.utility.test/' },
    { key: 'publicRssUrl', id: 'freshrss', en: 'RSS reader', es: 'Lector RSS', url: 'https://rss.utility.test/' },
    { key: 'publicPasteUrl', id: 'privatebin', en: 'Encrypted paste', es: 'Texto cifrado', url: 'https://paste.utility.test/' },
  ] as const;
  const serviceUrls = Object.fromEntries(services.map((service) => [service.key, service.url]));
  const removedIds = ['cobalt', 'ntfy', 'bentopdf', 'vert', 'omnitools', 'ittools', 'swagger-editor', 'healthchecks', 'pairdrop', 'rsshub', 'wakapi'];

  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      projectName: 'Public utility', projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
      sourceCodeUrl: '', supportUrl: '', contactUrl: '', ...serviceUrls,
      enabledServices: [...services.map((service) => service.id), ...removedIds], defaultLanguage: 'en',
    },
  }));
  await page.route('**/_portal/status', async (route) => route.fulfill({
    json: {
      checkedAt: '2026-09-03T01:00:00.000Z',
      services: services.map((service) => ({ id: service.id, status: 'operational' })),
    },
  }));

  for (const language of ['en', 'es'] as const) {
    await page.goto(`/${language}/?view=all`);
    for (const service of services) {
      const row = page.locator(`.catalog-ledger-row[data-catalog-id="${service.id}"]`);
      await expect(row, `${service.id} should be visible in ${language}`).toBeVisible();
      await expect(row.getByRole('heading', { name: service[language], exact: true })).toBeVisible();
      await expect(row.getByRole('link', { name: `${language === 'es' ? 'Abrir' : 'Open'}: ${service[language]}` })).toHaveAttribute('href', service.url);
    }
    await expect(page.locator('.catalog-ledger-access')).toHaveCount(1);
    await expect(page.locator('[data-catalog-id="freshrss"] .catalog-ledger-access')).toHaveText(language === 'es'
      ? 'Acceso: Se requiere una cuenta · Registro público cerrado'
      : 'Access: Account required · Public registration closed');
    for (const id of removedIds) await expect(page.locator(`[data-catalog-id="${id}"]`)).toHaveCount(0);
  }

  await page.goto('/en/status');
  await expect(page.getByRole('heading', { name: 'Web search', exact: true }).locator('..')).toContainText('Operational');
  await expect(page.getByRole('heading', { name: 'RSS reader', exact: true }).locator('..')).toContainText('Operational');
});

test('software inventory credits only retained Utilibre services and their data stores bilingually', async ({ page }) => {
  const deployedProjects = {
    SearXNG: { facts: '2026.8.22-9fea41204 · AGPL-3.0-or-later', source: 'https://github.com/searxng/searxng' },
    Redlib: { facts: 'a4d36e9 + local redirect hardening · AGPL-3.0-only', source: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374' },
    Anubis: { facts: '1.27.0 · MIT', source: 'https://github.com/TecharoHQ/anubis/tree/v1.27.0' },
    FreshRSS: { facts: '1.29.1 · AGPL-3.0', source: 'https://github.com/FreshRSS/FreshRSS/tree/1.29.1' },
    PrivateBin: { facts: '2.0.6 · Zlib', source: 'https://github.com/PrivateBin/PrivateBin/tree/2.0.6' },
    RSSHub: { facts: '40aca954 · AGPL-3.0', source: 'https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95' },
    PostgreSQL: { facts: '17.11-alpine · PostgreSQL License', source: 'https://github.com/postgres/postgres' },
    Valkey: { facts: '9.1.1-alpine · BSD-3-Clause', source: 'https://github.com/valkey-io/valkey/tree/9.1.1' },
  } as const;

  for (const language of ['en', 'es'] as const) {
    await page.goto(`/${language}/software`);
    for (const [project, expected] of Object.entries(deployedProjects)) {
      const item = page.getByRole('heading', { name: project, exact: true }).locator('..');
      await expect(item).toContainText(expected.facts);
      const sourceLabel = language === 'es' ? `Código fuente del proyecto original: ${project}` : `Upstream source: ${project}`;
      const source = item.getByRole('link', { name: sourceLabel, exact: true });
      await expect(source).toHaveAttribute('href', expected.source);
      await expect(source).toHaveAttribute('target', '_blank');
      await expect(source).toHaveAttribute('rel', 'noopener noreferrer');
    }
    for (const removed of ['Cobalt API', 'BentoPDF', 'VERT', 'OmniTools', 'Healthchecks', 'PairDrop', 'Wakapi']) {
      await expect(page.getByRole('heading', { name: removed, exact: true })).toHaveCount(0);
    }
  }
});

test('status page does not invent degradation when observations are missing or malformed', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      projectName: 'Public utility', projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
      sourceCodeUrl: '', supportUrl: '', contactUrl: '',
      publicSearchUrl: 'https://search.utility.test/', publicRedditUrl: 'https://reddit.utility.test/',
      enabledServices: ['searxng', 'redlib'], defaultLanguage: 'en',
    },
  }));
  await page.route('**/_portal/status', async (route) => route.fulfill({
    json: {
      checkedAt: 'not-a-date',
      services: [{ id: 'searxng', status: 'definitely-fine' }, { id: 42, status: 'operational' }],
    },
  }));

  await page.goto('/en/status');
  await expect(page.getByRole('heading', { name: 'Web search', exact: true }).locator('..')).toContainText('Not checked');
  await expect(page.getByRole('heading', { name: 'Redlib for Reddit', exact: true }).locator('..')).toContainText('Not checked');
  await expect(page.getByRole('status')).toHaveText('Last checked');
});

test('software page links the published repository license and notices bilingually', async ({ page }) => {
  const expectations = {
    en: {
      path: '/en/software',
      heading: 'License text and third-party notices',
      license: 'Read the AGPL-3.0-or-later license (LICENSE)',
      notices: 'Read the third-party notices (THIRD_PARTY_NOTICES)',
    },
    es: {
      path: '/es/software',
      heading: 'Texto de la licencia y avisos de terceros',
      license: 'Leer la licencia AGPL-3.0-or-later (LICENSE)',
      notices: 'Leer los avisos de software de terceros (THIRD_PARTY_NOTICES)',
    },
  } as const;

  for (const language of ['en', 'es'] as const) {
    const expected = expectations[language];
    await page.goto(expected.path);
    const section = page.getByRole('heading', { level: 2, name: expected.heading }).locator('..');
    const license = section.getByRole('link', { name: expected.license });
    const notices = section.getByRole('link', { name: expected.notices });
    await expect(section).toBeVisible();
    await expect(license).toBeVisible();
    await expect(notices).toBeVisible();
    await expect(license).toHaveAttribute('href', '/legal/LICENSE.txt');
    await expect(notices).toHaveAttribute('href', '/legal/THIRD_PARTY_NOTICES.txt');
    await expect(license).not.toHaveAttribute('target', '_blank');
    await expect(notices).not.toHaveAttribute('target', '_blank');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  }
});

test('all public pages render in both languages without missing strings', async ({ page }) => {
  const paths = [
    ['', ''], ['services', 'servicios'], ['tools', 'herramientas'], ['about', 'acerca'],
    ['transparency', 'transparencia'], ['privacy', 'privacidad'], ['acceptable-use', 'uso-aceptable'],
    ['status', 'estado'], ['software', 'software'],
    ['privacy-labels', 'etiquetas-privacidad'],
  ];
  for (const [enPath, esPath] of paths) {
    for (const [language, path] of [['en', enPath], ['es', esPath]] as const) {
      await page.goto(`/${language}/${path}`);
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('body')).not.toContainText(/\b(undefined|null)\b/);
      await expect(page.locator('meta[name=description]')).toHaveAttribute('content', /\S/);
    }
  }
});

test('transparency page discloses AI assistance equally in English and Spanish', async ({ page }) => {
  await page.goto('/en/transparency');
  await expect(page.getByRole('heading', { level: 2, name: 'How this version was developed' })).toBeVisible();
  await expect(page.getByText(/developed with extensive assistance from OpenAI Codex/)).toBeVisible();
  await page.goto('/es/transparencia');
  await expect(page.getByRole('heading', { level: 2, name: 'Cómo se desarrolló esta versión' })).toBeVisible();
  await expect(page.getByText(/se desarrolló con amplia asistencia de OpenAI Codex/)).toBeVisible();
});

test('every portal integration route is bilingual, labelled, and mobile-safe', async ({ page }) => {
  await mockConfig(page, { ...featuredConfig, publicRedditUrl: 'https://reddit.utility.test/', enabledServices: [...featuredConfig.enabledServices, 'redlib'] });
  const entries = catalog.filter((entry) => entry.slug);
  for (const language of ['en', 'es'] as const) {
    for (const entry of entries) {
      await page.goto(toolPath(entry.id, language));
      await expect(page.locator('html')).toHaveAttribute('lang', language);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(localized(entry.name, language));
      await expect(page.locator('meta[name=description]')).toHaveAttribute('content', localized(entry.description, language));
      await expect(page.locator('body')).not.toContainText(/\b(undefined|null)\b/);
      const controls = page.locator('input, select, textarea');
      for (let index = 0; index < await controls.count(); index += 1) {
        const control = controls.nth(index);
        const id = await control.getAttribute('id');
        const aria = await control.getAttribute('aria-label');
        const labels = id ? await page.locator(`label[for="${id}"]`).count() : 0;
        expect(labels + (aria ? 1 : 0), `${entry.id}/${language} missing a control label`).toBeGreaterThan(0);
      }
      const status = page.getByRole('status');
      if (await status.count()) await expect(status).toHaveAttribute('aria-live', 'polite');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), `${entry.id}/${language} overflowed`).toBe(false);
    }
  }
});

test('representative validation errors are translated into Spanish', async ({ page }) => {
  await mockConfig(page, { ...baseConfig, publicRedditUrl: 'https://reddit.utility.test/', enabledServices: ['redlib'] });
  await page.goto('/es/herramientas/abrir-con-privacidad');
  await page.getByLabel('URL pública compatible').fill('no es una URL');
  await page.getByRole('button', { name: 'Revisar URL' }).click();
  await expect(page.getByRole('status')).toContainText('URL HTTPS pública válida');
});

test('keyboard focus, semantic labels, reduced motion, and optional links are accessible', async ({ page }) => {
  await mockConfig(page, { ...baseConfig, publicRedditUrl: 'https://reddit.utility.test/', enabledServices: ['redlib'] });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/tools/open-privately');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const theme = page.locator('.theme-toggle');
  await expect(theme).toHaveAttribute('aria-label', 'Change color theme: System theme');
  await theme.click();
  await expect(theme).toHaveAttribute('aria-label', 'Change color theme: Light theme');
  const inputs = page.locator('input, select, textarea');
  for (let index = 0; index < await inputs.count(); index += 1) {
    const input = inputs.nth(index);
    const id = await input.getAttribute('id');
    const aria = await input.getAttribute('aria-label');
    const labels = id ? await page.locator(`label[for="${id}"]`).count() : 0;
    expect(labels + (aria ? 1 : 0)).toBeGreaterThan(0);
  }
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  const motion = await page.locator('.button').evaluate((item) => getComputedStyle(item).transitionDuration);
  expect(Number.parseFloat(motion)).toBeLessThanOrEqual(0.001);
  await page.goto('/en/support');
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toHaveCount(0);
});

test('skip-link activation is retained while public configuration is still loading', async ({ page }) => {
  let releaseConfig!: () => void;
  let observeConfigRequest!: () => void;
  const configGate = new Promise<void>((resolve) => { releaseConfig = resolve; });
  const configRequested = new Promise<void>((resolve) => { observeConfigRequest = resolve; });

  await page.route('**/_portal/config', async (route) => {
    observeConfigRequest();
    await configGate;
    await route.continue();
  });

  const navigation = page.goto('/en/tools/open-privately');
  await configRequested;
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  releaseConfig();
  await navigation;
  await expect(page.locator('#main-content')).toBeFocused();
});

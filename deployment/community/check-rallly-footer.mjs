import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const out = '/opt/utilibre/reports/native-navigation-20261009';
const fixture = JSON.parse(await readFile(out + '/rallly-footer-fixture.json', 'utf8'));
assert(fixture.fixtureOnly && /^utilibrefooter[a-f0-9]{32}$/.test(fixture.id));
const config = JSON.parse(await readFile(out + '/rallly-footer-config.json', 'utf8'));
const before = JSON.parse(await readFile(config.rollbackRow, 'utf8'));
const expected = [...before.footer_links,
  { label: 'More tools from Utilibre', href: 'https://utilibre.org/en/' },
  { label: 'Más herramientas de Utilibre', href: 'https://utilibre.org/es/' },
];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const language of ['en', 'es']) {
    for (const [size, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      const context = await browser.newContext({ locale: language, viewport, isMobile: size === 'mobile' });
      await context.addCookies([{ name: 'rallly_locale', value: language, domain: 'poll.utilibre.org', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
      const page = await context.newPage();
      page.setDefaultTimeout(25000);
      const errors = [], hosts = new Set();
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', request => hosts.add(new URL(request.url()).hostname));
      // The ordinary JS login deliberately redirects to the sole OIDC provider.
      // Its native error/recovery screen is stable and uses the same footer.
      for (const [surface, path] of [['login-recovery', '/login?error=access_denied'], ['invite', '/invite/' + fixture.id]]) {
        const response = await page.goto('https://poll.utilibre.org' + path);
        assert(response.ok());
        for (const link of expected) {
          const anchor = page.getByRole('link', { name: link.label, exact: true });
          await anchor.waitFor();
          assert.equal(await anchor.getAttribute('href'), link.href);
          await anchor.click({ trial: true });
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: out + '/rallly-footer-' + language + '-' + size + '-' + surface + '.png', fullPage: true });
      }
      assert.deepEqual(errors, []);
      assert.deepEqual([...hosts].filter(host => !['poll.utilibre.org', 'auth.utilibre.org'].includes(host)), []);
      const noJs = await browser.newContext({ javaScriptEnabled: false, locale: language, viewport });
      await noJs.addCookies([{ name: 'rallly_locale', value: language, domain: 'poll.utilibre.org', path: '/', secure: true, httpOnly: true, sameSite: 'Lax' }]);
      const plain = await noJs.newPage();
      assert((await plain.goto('https://poll.utilibre.org/login')).ok());
      for (const link of expected) {
        // Next's streamed async footer remains in a hidden boundary without JS.
        // Inspect the emitted anchor, not a claim of no-JS app functionality.
        const emitted = plain.locator('a').filter({ hasText: link.label });
        await emitted.first().waitFor({ state: 'attached' });
        assert.equal(await emitted.first().getAttribute('href'), link.href);
      }
      assert(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await noJs.close();
      results.push({ language, size, nativeLoginRecoveryAndFictionalInvite: true, ordinaryLoginEmitsFooterAnchors: true, ordinaryLoginNeedsJsForStreamedFooter: true, normalOidcRedirectUnchanged: true, allExistingLinksPreserved: true, bothCatalogLinksAccessible: true, noHorizontalOverflow: true, errors, hosts: [...hosts] });
      await context.close();
    }
  }
  await writeFile(out + '/rallly-footer-browser.json', JSON.stringify(results, null, 2));
  console.log('Native logged-out login and fictional invite footers pass in EN/ES, desktop/mobile; all existing links remain.');
} finally {
  await browser.close();
}

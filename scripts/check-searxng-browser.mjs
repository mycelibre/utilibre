// Real browser checks; no production limiter or proxy-trust changes.
import assert from 'node:assert/strict';
import { chromium } from '../portal/node_modules/playwright/index.mjs';

const base = new URL(process.argv[2] || 'https://search.utilibre.org/');
const edge = process.argv[3];
assert.ok(['http:', 'https:'].includes(base.protocol));
assert.ok(!edge || /^10\.10\.1\.3$/.test(edge), 'Only the configured private edge may be selected');
const browser = await chromium.launch({ args: edge ? [`--host-resolver-rules=MAP ${base.hostname} ${edge}`] : [] });
try {
  for (const locale of ['en-US', 'es-GT']) {
    const context = await browser.newContext({
      locale,
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    const response = await page.goto(base.href, { timeout: 30000 });
    assert.equal(response.status(), 200, 'Search home must load');
    await page.locator('input[name="q"]').fill(locale === 'en-US' ? 'Guatemala geography' : 'Guatemala geografía');
    const result = page.waitForResponse(r => new URL(r.url()).pathname === '/search' && r.request().isNavigationRequest(), { timeout: 45000 });
    await page.locator('input[name="q"]').press('Enter');
    assert.equal((await result).status(), 200, 'Search must return HTTP 200');
    await page.locator('article.result').nth(2).waitFor({ timeout: 30000 });
    assert.equal(new URL(page.url()).origin, base.origin, 'Tests must stay on the intended instance');
    assert.ok(await page.locator('article.result h3 a[href^="http"]').count() >= 3, 'Search must contain actual result links');
    console.log(`${locale}: real search returned at least three results`);
    await context.close();
  }
} catch {
  // Never print query URLs, browser cookies, or page HTML into operator logs.
  console.error('SearXNG browser check failed; inspect the instance before retrying.');
  process.exitCode = 1;
} finally {
  await browser.close();
}

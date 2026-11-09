// Read-only public checks against actual deployed assets. No response replacement,
// accounts, documents, event creation, poll creation or correspondence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const origins = {cryptpad:'https://pad.utilibre.org', gathio:'https://events.utilibre.org', rallly:'https://poll.utilibre.org', forms:'https://forms.utilibre.org'};
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export async function checkPublished(key, out) {
  assert(Object.hasOwn(origins, key));
  const browser = await chromium.launch();
  const external = new Set(), writes = [], blockedWrites = [], errors = [], assets = {}, pending = [];
  const allowed = new Set([new URL(origins[key]).hostname]);
  if (key === 'cryptpad') allowed.add('sandbox-pad.utilibre.org');
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000}, locale:'es-GT', serviceWorkers:'block'});
    // Prevent accidental authentication/content writes before they leave the
    // browser. GET/HEAD responses, including native assets, are unchanged.
    await context.route('**/*', route => {
      const request = route.request();
      if (!['GET', 'HEAD'].includes(request.method())) {
        blockedWrites.push(request.method() + ' ' + new URL(request.url()).pathname);
        return route.abort('blockedbyclient');
      }
      return route.continue();
    });
    const page = await context.newPage(); page.setDefaultTimeout(25000);
    page.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && !allowed.has(url.hostname)) external.add(url.origin);
      if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method() + ' ' + url.pathname);
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      const path = new URL(response.url()).pathname;
      if (key === 'cryptpad' && ['/customize/pages.js', '/common/common-ui-elements.js'].includes(path)) {
        pending.push(response.body().then(bytes => { assets[path] = sha(bytes); }));
      }
    });
    // Rallly's supported error state suppresses automatic OIDC initiation while
    // rendering its unchanged native login layout and footer. The query carries
    // no private information and does not change settings or create a session.
    const publicPath = key === 'rallly' ? '/login?error=read_only_notice_check' : '/';
    const response = await page.goto(origins[key] + publicPath);
    assert.equal(response.status(), 200);
    const report = page.locator('a[href="https://utilibre.org/en/abuse"]').first();
    await report.waitFor();
    assert((await report.innerText()).includes('Report abuse'));
    if (key === 'rallly') {
      for (const href of ['https://utilibre.org/es/', 'https://utilibre.org/en/', 'https://utilibre.org/en/privacy']) {
        assert(await page.locator(`a[href="${href}"]`).count(), href);
      }
      await page.getByText('Privacy / Privacidad', {exact:true}).waitFor();
      const plan = JSON.parse(fs.readFileSync(new URL('native-hooks.json', import.meta.url)));
      assert(await page.locator(`a[href="${plan.rallly.after[2].href}"]`).count(), 'Upstream source credit');
    }
    const widths = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height:1000});
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({path:`${out}/${key}-live-home-${width}.png`, fullPage:true});
      widths.push(width);
    }
    if (key === 'cryptpad') {
      assert.equal(await page.locator('#utilibre-abuse-report a').count(), 2);
      await page.evaluate(() => new Promise((resolve, reject) => {
        window.require(['/common/common-ui-elements.js'], module => {
          try { module.displayInfoMenu({}, {getPrivateData:() => ({origin:location.origin})}); resolve(true); }
          catch (error) { reject(error); }
        }, reject);
      }));
      const about = page.locator('.cp-info-menu-container'); await about.waitFor();
      const links = about.locator('a[href="https://utilibre.org/en/abuse"], a[href="https://utilibre.org/es/denunciar-abuso"]');
      assert.equal(await links.count(), 2);
      assert.equal(await links.first().getAttribute('referrerpolicy'), 'no-referrer');
      await about.screenshot({path:`${out}/cryptpad-live-about.png`});
      await Promise.all(pending);
      const expected = JSON.parse(fs.readFileSync(new URL('inputs.json', import.meta.url))).services.find(s => s.service === key);
      assert.equal(assets['/customize/pages.js'], expected.files.find(f => f.file === 'pages.js').afterSha256);
      assert.equal(assets['/common/common-ui-elements.js'], expected.files.find(f => f.file === 'common-ui-elements.js').afterSha256);
    }
    assert.equal(external.size, 0);
    assert.deepEqual(writes, []);
    assert.deepEqual(blockedWrites, []);
    assert.deepEqual(errors, []);
    const result = {key, status:'passed', actualAssets:true, responseInterception:false, readOnlyRequestGuard:true, publicPath, widths, externalRequests:[...external], writes, blockedWrites, browserErrors:errors, assets,
      ...(key === 'rallly' ? {surface:'Actual native login footer; supported error query suppresses automatic OIDC initiation without altering authentication settings.'} : {}),
      ...(key === 'cryptpad' ? {about:'Native renderer invoked on the public homepage with only its public origin; no pad or account opened.'} : {})};
    fs.writeFileSync(`${out}/${key}-live-browser.json`, JSON.stringify(result, null, 2) + '\n');
    return result;
  } finally { await browser.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await checkPublished(process.argv[2], process.argv[3])));
}

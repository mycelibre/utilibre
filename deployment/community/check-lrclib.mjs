import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../portal/package.json', import.meta.url));
const { chromium } = require('playwright');
const base = process.env.LRCLIB_CHECK_URL || 'http://127.0.0.1:3342';
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, viewport] of [['desktop', {width:1280,height:900}], ['mobile', {width:390,height:844}]]) {
    const context = await browser.newContext({ viewport });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const page = await context.newPage();
    const external = [], errors = [], cspErrors = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(base).origin) external.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type()==='error' && message.text().includes('Content Security Policy')) cspErrors.push(message.text()); });
    await page.goto(base);
    assert(await page.getByRole('heading', {name:'LRCLIB · Utilibre instance'}).isVisible());
    if (process.env.LRCLIB_SCREENSHOTS === '1') await page.screenshot({path:`/tmp/lrclib-${name}.png`});
    await page.getByRole('searchbox', {name:'Song or artist'}).fill('Amazing Grace');
    const response = page.waitForResponse(response=>new URL(response.url()).pathname==='/api/search');
    await page.getByRole('button', {name:'Search lyrics', exact:true}).click();
    const records = await (await response).json();
    // Do not mistake the instrumental placeholder for actual lyrics content.
    const index = records.findIndex(record=>record.plainLyrics?.length>50 && record.syncedLyrics?.length>50);
    assert(index>=0,'No representative lyric record returned');
    await page.getByRole('button', {name:/Read lyrics:/}).first().waitFor({timeout:20000});
    const count = await page.getByRole('button', {name:/Read lyrics:/}).count();
    assert(count>0);
    await page.getByRole('button', {name:/Read lyrics:/}).nth(index).click();
    assert(await page.getByRole('dialog', {name:'Lyrics preview'}).isVisible());
    assert((await page.locator('dialog .whitespace-pre-line').textContent()).trim().length>20);
    const copy = page.getByRole('button', {name:'Copy lyrics', exact:true});
    if (await copy.count()) {
      await copy.click();
      assert((await page.evaluate(()=>navigator.clipboard.readText()))===records[index].syncedLyrics,'Synced lyrics copy mismatch');
      await page.getByRole('button',{name:'Plain Lyrics',exact:true}).click();
      await copy.click();
      assert((await page.evaluate(()=>navigator.clipboard.readText()))===records[index].plainLyrics,'Plain lyrics copy mismatch');
    } else throw Error('Representative track unexpectedly has no copyable lyrics');
    assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog').count(),0);
    // Offline fixtures exercise error and empty states without more upstream traffic.
    await page.route('**/api/search?*', route=>route.fulfill({status:429,contentType:'application/json',headers:{'Retry-After':'90'},body:'{}'}));
    await page.getByRole('searchbox').fill('Rate limit fixture');
    await page.getByRole('button',{name:'Search lyrics',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert((await page.getByRole('alert').textContent()).includes('90 seconds'));
    await page.unroute('**/api/search?*');
    await page.route('**/api/search?*', route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
    await page.getByRole('searchbox').fill('Empty fixture');
    await page.getByRole('button',{name:'Search lyrics',exact:true}).click();
    await page.getByText('No lyrics found. Try a different song title or artist.').waitFor();
    assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    // Cloudflare injects an inline security script on the public edge. Do not
    // weaken CSP for it: distinguish this expected block from app failures.
    const inline = await page.locator('script:not([src])').evaluateAll(nodes=>nodes.map(n=>n.textContent));
    if (cspErrors.length) {
      assert.equal(new URL(base).hostname,'lyrics.utilibre.org');
      assert(inline.length>0 && inline.every(script=>script.includes('/cdn-cgi/challenge-platform/')));
      assert(cspErrors.every(message=>message.startsWith('Executing inline script violates') && message.includes("script-src 'self'")));
    }
    console.log(`${name}: search (${count} results), lyrics preview/copy, keyboard close, empty/429 recovery, no external browser requests or application JS errors; ${cspErrors.length} Cloudflare injection blocked by CSP`);
    await context.close();
  }
} finally { await browser.close(); }

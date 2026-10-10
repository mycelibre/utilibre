// Read-only checks against the production renderer, locally or on the public host.
import assert from 'node:assert/strict';
import { chromium } from '../portal/node_modules/playwright/index.mjs';
const base = process.argv[2] || 'http://127.0.0.1:4191';
const browser = await chromium.launch();
try {
  const context = await browser.newContext({javaScriptEnabled:false, viewport:{width:375,height:812}});
  for (const language of ['en','es']) {
    const page = await context.newPage();
    const response = await page.goto(`${base}/${language}/`); assert.equal(response.status(),200);
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.ok(await page.locator('.main-nav').isVisible(),'Essential mobile navigation works without JavaScript');
    assert.equal(await page.locator('.menu-toggle').isVisible(),false);
    assert.equal(await page.locator('.theme-toggle').isVisible(),false);
    await page.locator('.main-nav a').first().focus();
    assert.ok(await page.locator('.main-nav a').first().evaluate(node=>node===document.activeElement));
    await page.keyboard.press('Tab'); assert.ok(await page.locator('.main-nav a').nth(1).evaluate(node=>node===document.activeElement));
    await page.locator('#catalog-query').fill('PrivateBin'); await page.locator('.catalog-search button').click();
    assert.equal(new URL(page.url()).searchParams.get('q'),'PrivateBin');
    assert.ok(await page.locator('.catalog-ledger-row').count()>0);
    for (const route of ['security','your-data',language==='es'?'privacidad':'privacy',language==='es'?'estado':'status',language==='es'?'herramientas/abrir-con-privacidad':'tools/open-privately']) {
      const r=await page.goto(`${base}/${language}/${route}`);assert.equal(r.status(),200);
      assert.ok((await page.locator('h1').innerText()).length>5);
      assert.ok(await page.locator('.main-nav').isVisible());
      const text=await page.locator('main').innerText();
      assert.doesNotMatch(text,/\(verify\)|\(set up\)|\[counsel\]|undefined|\{[A-Za-z]+\}/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),false,'No horizontal page overflow');
      if(route==='security')assert.ok(await page.locator('a[href="mailto:admin@utilibre.org"]').count()>0);
      if(route==='your-data')for(const id of ['freshrss','cryptpad','actual','wakapi','rallly','pollaris','liberaforms','fmd','reactive-resume','penpot'])assert.equal(await page.locator(`main section#${id}`).count(),1);
    }
    await page.close();
  }
  await context.close();
  const slow=await browser.newContext({viewport:{width:375,height:812}});const page=await slow.newPage();
  let release;const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/assets/*.js',async route=>{await gate;await route.continue();});
  await page.goto(`${base}/en/`,{waitUntil:'commit'});
  await page.locator('.main-nav').waitFor({state:'visible'});
  assert.ok(await page.locator('.main-nav').isVisible(),'Navigation works while JavaScript is delayed');
  release();await page.waitForSelector('.site-header[data-interactive="true"]');
  await page.locator('.menu-toggle').click();assert.ok(await page.locator('.main-nav').isVisible());
  assert.ok(await page.locator('.theme-toggle').isEnabled());await slow.close();
  const notice=await fetch(`${base}/.well-known/security.txt`);assert.equal(notice.status,200);assert.equal(notice.headers.get('content-type'),'text/plain; charset=utf-8');
  const content=await notice.text();assert.match(content,/^Contact: mailto:admin@utilibre.org$/m);assert.match(content,/^Preferred-Languages: en, es$/m);
  const expires=Date.parse(content.match(/^Expires: (.+)$/m)?.[1]||'');assert.ok(expires>Date.now());
  console.log('EN/ES policy pages, ten export sections, no-JS search/keyboard navigation, delayed-JS hydration, layout and security.txt passed.');
} finally {await browser.close();}

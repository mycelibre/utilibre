import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const report=process.argv[2]; assert(report);
const origin=process.env.READER_ORIGIN || 'http://127.0.0.1:3207';
const browser=await chromium.launch();
const context=await browser.newContext({serviceWorkers:'block'});
const outside=[]; const results=[];
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin===origin && ['/', '/article'].includes(url.pathname)) return route.continue();
 outside.push(url.href);return route.abort();
});
try {
 for(const language of ['en','es']) {
  const page=await context.newPage();
  const home=await page.goto(`${origin}/?lang=${language}`);assert.equal(home.status(),200);
  assert((await page.locator('h1').first().innerText()).includes(language==='es'?'Leé':'Read'));
  await page.locator('input[name=link]').fill('https://tools.utilibre.org/utilibre-source/reader-fictional-20261009.html');
  await Promise.all([page.waitForURL(`${origin}/article?lang=${language}`),page.locator('input[type=submit]').click()]);
  assert((await page.locator('body').innerText()).includes('utilibre-reader-fictional-20261009'));
  assert.equal(await page.evaluate(()=>window.utilibreUnexpectedScript===true),false);
  assert.equal(await page.locator('meta[http-equiv=refresh], script, iframe, form').count(),0);
  assert.equal(new URL(await page.locator('a').first().getAttribute('href')).host,'example.invalid');
  await page.waitForTimeout(1200);assert(page.url().startsWith(`${origin}/article`));
  results.push({language,nativeFormWorks:true,sourceScriptsRemoved:true,noAutomaticNavigation:true,articleReadable:true});
  await page.close();await new Promise(r=>setTimeout(r,5500));
 }
 assert.deepEqual(outside,[]);
 await writeFile(report+'/browser-results.json',JSON.stringify({results,outsideResourceAttempts:outside.length},null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({results,outsideResourceAttempts:outside.length}));
} finally {await context.close();await browser.close();}

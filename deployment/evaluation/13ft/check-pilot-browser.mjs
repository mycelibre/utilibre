import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
const report=process.argv[2];
assert(report, 'Supply the private report directory');
const origin='http://172.29.100.30:8080';
const browser=await chromium.launch();
const context=await browser.newContext({serviceWorkers:'block'});
const outsideAttempts=[];
await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin && ['/', '/article'].includes(url.pathname)) return route.continue();
  outsideAttempts.push(url.href);return route.abort();
});
try {
 const page=await context.newPage();await page.goto(origin+'/');
 await page.locator('input[name=link]').fill('http://172.29.100.20:8081/article');
 await Promise.all([page.waitForURL(origin+'/article'),page.locator('input[type=submit]').click()]);
 assert((await page.locator('body').innerText()).includes('Fictional rivers study'));
 assert.equal(await page.evaluate(()=>window.utilibreFixtureExecuted===true),false);
 assert.equal(await page.locator('meta[http-equiv=refresh]').count(),0);
 assert.deepEqual(outsideAttempts,[]);
 const result={nativeFormWorksWithoutJavaScript:true,articleReadable:true,inlineScriptExecuted:false,outsideResourceAttempts:0,metaRefreshRemoved:true};
 await writeFile(report+'/pilot-browser-results.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify(result));
} finally {await context.close();await browser.close();}

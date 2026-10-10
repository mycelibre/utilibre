// Render only a fictional local fixture. Intercept every browser request.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
const directory='/opt/utilibre/reports/13ft-review-20261008';
const html=await readFile(directory+'/fictional-rendered.html','utf8');
const browser=await chromium.launch();const results=[];
try {
 for(const protectedView of [false,true]){
  const context=await browser.newContext({serviceWorkers:'block'});const attempted=[];
  await context.route('**/*',async route=>{
   if(route.request().url()==='https://13ft.invalid/fixture')return route.fulfill({status:200,contentType:'text/html',body:html,headers:protectedView?{'Content-Security-Policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'",'Referrer-Policy':'no-referrer'}:{}});
   attempted.push(route.request().url());return route.abort();
  });
  const page=await context.newPage();await page.goto('https://13ft.invalid/fixture');
  const executed=await page.evaluate(()=>window.utilibreFixtureExecuted===true);
  assert((await page.locator('body').innerText()).includes('Fictional rivers study'));
  if(protectedView){assert.equal(executed,false);assert.equal(attempted.length,0);}
  else{assert.equal(executed,true);assert(attempted.some(url=>url.includes('pixel.example.invalid')));assert(attempted.some(url=>url.includes('track.example.invalid')));}
  results.push({view:protectedView?'illustrative static CSP only':'native returned HTML',inlineScriptExecuted:executed,blockedFictionalResourceAttempts:attempted.length,externalNetworkRequests:0});
  await context.close();
 }
}finally{await browser.close()}
await writeFile(directory+'/browser-results.json',JSON.stringify(results,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(results));

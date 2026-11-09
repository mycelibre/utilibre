// One explicitly authorized synthetic search, no retries or result navigation.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
const stage=process.argv[2];
assert(stage && /^\/var\/lib\/utilibre-maintenance\/degoog-repair-20261109-[a-z0-9-]+$/.test(stage));
const activation=JSON.parse(await readFile(stage+'/activation.json','utf8'));
assert(activation.ready && activation.publicSearchGate==='pending');
await writeFile(stage+'/public-query-used.json', JSON.stringify({at:new Date().toISOString(),query:'how to boil eggs'}),{flag:'wx',mode:0o600});
const origin='https://degoog.utilibre.org';
const browser=await chromium.launch({headless:true});
let evidence;
const external=new Set(),errors=[],failed=[],api=[];
let page;
try {
  const context=await browser.newContext({viewport:{width:1280,height:900},locale:'en'});
  page=await context.newPage();
  context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(new URL(r.url()).origin)});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{
    const path=new URL(r.url()).pathname;
    if(r.status()>=400 && !(r.status()===404&&path==='/api/proxy/favicon'))failed.push({path,status:r.status()});
    if(path==='/api/search') {try{const d=await r.json();api.push({status:r.status(),count:d.results?.length,engines:d.engineTimings});}catch{}}
  });
  const home=await page.goto(origin,{waitUntil:'networkidle'});
  assert.equal(home.status(),200);
  const assetUrl=await page.locator('script[src*="/public/app.js"]').getAttribute('src');
  assert.ok(assetUrl.includes('utilibre.search.20261109'));
  await page.locator('#search-input').fill('how to boil eggs');
  await page.locator('#btn-search').click();
  await page.waitForFunction(()=>document.querySelector('#results-list')?.textContent?.includes('providers') || document.querySelectorAll('#results-list a.result-title').length>0,{},{timeout:25000});
  await page.waitForTimeout(5000);
  const count=await page.locator('#results-list a.result-title').count();
  const text=await page.locator('body').innerText();
  evidence={at:new Date().toISOString(),imageId:activation.imageId,assetUrl,htmlCacheStatus:home.headers()['cf-cache-status'],count,braveAttribution:text.includes('Brave'),googleLimitNotice:text.includes('Google Cse (temporarily rate limited)'),external:[...external],errors,failed,api,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)};
  await page.screenshot({path:stage+'/public-search.png'});
  await writeFile(stage+'/public-search.json',JSON.stringify(evidence,null,2)+'\n');
  assert.ok(count>=10, 'Insufficient public results');
  assert.ok(evidence.braveAttribution);assert.ok(evidence.googleLimitNotice);
  assert.deepEqual([...external],[]);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.equal(evidence.overflow,false);
  activation.publicSearchGate='passed';activation.publicResultCount=count;
  await writeFile(stage+'/activation.json',JSON.stringify(activation,null,2)+'\n');
  console.log(JSON.stringify(evidence));
} catch(error) {
  const forensic={at:new Date().toISOString(),error:String(error),external:[...external],errors,failed,api,body:page?await page.locator('body').innerText().catch(()=>null):null};
  await writeFile(stage+'/public-search-failed.json',JSON.stringify(forensic,null,2)+'\n');
  if(page)await page.screenshot({path:stage+'/public-search-failed.png'}).catch(()=>{});
  throw error;
} finally {await browser.close();}

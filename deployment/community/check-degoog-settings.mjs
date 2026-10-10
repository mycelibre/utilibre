// Disposable browser preferences only; never submits operator credentials.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base='https://degoog.utilibre.org',out='/opt/utilibre/reports/degoog-settings-20261009';
const settingsPath='/opt/utilibre/community-data/degoog/server-settings.json';
const hash=async()=>createHash('sha256').update(await readFile(settingsPath)).digest('hex');
const before=await hash(),browser=await chromium.launch(),result=[];
try {
 for(const [name,width,lang]of [['desktop',1280,'en'],['mobile',390,'es'],['narrow',320,'es']]) {
  const context=await browser.newContext({viewport:{width,height:844},locale:lang,serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],failures=[],external=new Set(),writes=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failures.push({path:new URL(response.url()).pathname,status:response.status()})});
  page.on('request',request=>{if(new URL(request.url()).origin!==base)external.add(new URL(request.url()).origin);if(!['GET','HEAD'].includes(request.method()))writes.push({path:new URL(request.url()).pathname,method:request.method()})});
  assert.equal((await page.goto(base+'/settings',{waitUntil:'networkidle'})).status(),200);
  assert.equal(await page.evaluate(()=>window.__DEGOOG_PUBLIC_INSTANCE__),true);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  await page.locator('#theme-select').selectOption('dark');
  if(!await page.locator('#settings-open-new-tab').isChecked())
    await page.locator('label').filter({has:page.locator('#settings-open-new-tab')}).click();
  await page.waitForFunction(()=>document.documentElement.getAttribute('data-theme')==='dark');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#theme-select').inputValue(),'dark');
  assert(await page.locator('#settings-open-new-tab').isChecked());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await page.locator('#server-content,#plugins-content,#transports-content').count(),0);
  await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.deepEqual([...external],[]);assert.deepEqual(writes,[]);
  result.push({name,width,lang,status:200,publicNativeSettings:true,themeAndPreferencePersist:true,noHorizontalOverflow:true,noAdminPanels:true,pageErrors:errors,failedResponses:failures,externalOrigins:[...external],serverWrites:writes});
  await context.close();
 }
 const request=await browser.newContext();
 const denied=[];
 for(const path of ['/settings/general','/setup','/api/settings','/api/settings/export','/api/store/repos','/api/indexer/export','/api/extensions/fictional']) {
  const response=await request.request.get(base+path);assert.equal(response.status(),404,path);denied.push({path,status:response.status()});
 }
 for(const path of ['/settings','/api/settings/field','/api/settings/sync']) {
  const response=await request.request.post(base+path,{data:{}});assert.equal(response.status(),405,path);denied.push({path,method:'POST',status:response.status()});
 }
 const head=await request.request.head(base+'/settings');assert.equal(head.status(),200);
 const trailing=await request.request.get(base+'/settings/',{maxRedirects:0});assert.equal(trailing.status(),308);assert.equal(new URL(trailing.headers().location,base).pathname,'/settings');
 for(const endpoint of ['appearance','tab-order','languages','streaming'])assert.equal((await request.request.get(base+'/api/settings/'+endpoint)).status(),200);
 assert.equal(await hash(),before,'Operator settings must not change');
 await writeFile(out+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),scenarios:result,head:200,trailingSlash:308,denied,operatorSettingsUnchanged:true},null,2)+'\n');
 console.log(JSON.stringify({scenarios:result.map(r=>r.name),operatorSettingsUnchanged:true,deniedRoutes:denied.length}));
 await request.close();
} finally {await browser.close()}

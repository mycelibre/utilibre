// Fixed loopback candidate; no live form submission or production changes.
import assert from 'node:assert/strict';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();const results=[];
try {
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const requests=[];const errors=[];context.on('request',r=>requests.push({url:r.url(),method:r.method()}));
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const lang of ['es','en']){
   const path=lang==='es'?'/es/colecciones/documentos-y-tramites':'/en/collections/documents-and-applications';
   await page.goto('http://127.0.0.1:34180'+path);
   await page.waitForFunction(()=>document.querySelector('main.scenario-collection')&&document.querySelector('button')?.textContent);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('.collection-tools-list > li').count(),4);
   const quick=page.locator('.collection-tools-list > li').first().locator('a');
   for(const task of ['merge','compress','ocr']) assert((await quick.evaluateAll(ns=>ns.map(n=>n.href))).includes('https://pdf.utilibre.org/'+(lang==='es'?'es/':'')+task+'-pdf.html'));
   const report=page.locator('#problem-report a');assert.equal(await report.getAttribute('href'),'https://forms.utilibre.org/feedback');
   assert.equal(await report.getAttribute('rel'),'noopener noreferrer');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('a[download][href$="-a.pdf"]').click()]);
   assert.equal(await download.failure(),null);assert.equal(download.suggestedFilename(),'pdf-'+lang+'-a.pdf');
   const before=await page.evaluate(()=>localStorage.getItem('portal.toolkits.v1'));
   await page.locator('header.page-header a[href*="#collection="]').click();
   await page.locator('.toolkit-shared').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('portal.toolkits.v1')),before);
   await page.getByRole('button',{name:lang==='es'?'Guardar una copia en mis colecciones':'Save a copy to my collections',exact:true}).click();
   const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('portal.toolkits.v1')));
   assert.equal(saved.collections.at(-1).tools.length,4);
   results.push({width,lang,collection:true,threeNativePdfLinks:true,sampleDownload:true,explicitCollectionSave:true});
  }
  for(const path of ['/es/guias/preparar-imagen','/en/guides/file-transfer','/en/pdf-tools','/es/guias/documentos-escaneados']){
   await page.goto('http://127.0.0.1:34180'+path);await page.locator('#problem-report a').waitFor();
   assert.equal(await page.locator('#problem-report a').getAttribute('href'),'https://forms.utilibre.org/feedback');
  }
  // Fulfil the optional feedback destination: no real response is submitted.
  const handoff=[];await context.route('https://forms.utilibre.org/**',r=>{handoff.push({url:r.request().url(),method:r.request().method(),referer:r.request().headers().referer});return r.fulfill({contentType:'text/html',body:'<!doctype html><title>Controlled destination</title>'});});
  const popup=context.waitForEvent('page');await page.locator('#problem-report a').click();await(await popup).waitForLoadState();
  assert.deepEqual(handoff,[{url:'https://forms.utilibre.org/feedback',method:'GET',referer:undefined}]);
  assert.deepEqual(errors,[]);
  assert(requests.every(r=>r.method==='GET'&&(new URL(r.url).origin==='http://127.0.0.1:34180'||r.url==='https://forms.utilibre.org/feedback')));
  await context.close();
 }
 await writeFile('/var/lib/utilibre-maintenance/search-20261115/portal-staging.json',JSON.stringify({passed:true,results,externalApplicationRequests:0,realFormSubmissions:0,limitations:'Chromium desktop and mobile viewport; not physical iOS'},null,2)+'\n');console.log('Candidate artifact: native links, downloads, save-without-replacement, failure reporting and no automatic external requests passed.');
} finally {await browser.close();}

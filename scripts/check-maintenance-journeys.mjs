// Bounded checks of changed portal journeys; no visitor instrumentation.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {chromium} from '../portal/node_modules/playwright/index.mjs';
const origin=process.env.PORTAL_CHECK_ORIGIN||'https://utilibre.org';
const out=process.env.UTILIBRE_JOURNEY_REPORT_DIR||'/opt/utilibre/reports/maintenance-20261011';
await mkdir(out,{recursive:true,mode:0o700});
const browser=await chromium.launch({args:['--no-sandbox']});
const report={date:new Date().toISOString(),origin,environment:'Linux Chromium: 1366px desktop and 390px mobile emulation, including 200% text; not physical phones',checks:[],external:[],errors:[]};
try{
 for(const [lang,width]of [['en',1366],['es',390]]){
  const context=await browser.newContext({viewport:{width,height:844},acceptDownloads:true});const page=await context.newPage();
  page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)report.external.push(new URL(r.url()).origin);});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin+'/'+lang+'/?view=accounts',{waitUntil:'networkidle'});
  for(const id of ['grist','candlr','bookplate','freshrss']){
   const card=page.locator(`[data-catalog-id="${id}"]`);assert.equal(await card.count(),1);
   const summary=card.locator('summary');await summary.focus();await page.keyboard.press('Enter');
   assert(await card.locator('details').evaluate(e=>e.open));
   const request=card.locator('a[href^="mailto:"]');assert.equal(await request.count(),['grist','candlr'].includes(id)?1:0);
   assert.equal(await card.locator('.catalog-ledger-launch').getAttribute('target'),'_blank');
   await summary.press('Enter');
  }
  await page.locator('[data-catalog-id="grist"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/after-accounts-'+lang+'.png'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.goto(origin+'/'+lang+'/?view=public',{waitUntil:'networkidle'});
  for(const id of ['bentopdf','openreel','vvveb','blockbench','glyphr','jscad','fossflow','grid','openplan3d'])assert.equal(await page.locator(`[data-catalog-id="${id}"] .catalog-example-link`).count(),1,id);
  // Follow the actual card link, preserve its anchor, download a harmless example.
  await page.locator('[data-catalog-id="blockbench"] .catalog-example-link').click();
  await page.locator('#practice').waitFor();assert.equal(new URL(page.url()).hash,'#practice');
  assert.equal(await page.locator('h1').count(),1);
  assert.equal(await page.locator('html').getAttribute('lang'),lang);
  const download=page.waitForEvent('download');await page.locator('#practice a[download]').first().click();assert((await download).suggestedFilename());
  const go=page.locator('header.page-header a[href="#steps"]');await go.focus();await page.keyboard.press('Enter');
  assert.equal(new URL(page.url()).hash,'#steps');
  assert.equal(await page.locator('.guide-actions a[target="_blank"]').count(),1);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/after-guide-'+lang+'.png'});
  for(const scale of ['100%','200%']){await page.evaluate(s=>document.documentElement.style.fontSize=s,scale);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),lang+' guide overflow '+scale);}
  await page.locator('header.page-header nav a[href="/'+lang+'/"]').click();assert.equal(new URL(page.url()).pathname,'/'+lang+'/');
  report.checks.push(lang+': account disclosure keyboard controls, correct request access routes, nine example/guide links, example download, guide anchors/new-tab action/return link and text reflow');
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.passed=true;
}finally{await browser.close();await writeFile(out+'/journeys.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}

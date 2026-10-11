// Bounded release check, not visitor instrumentation.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const root='https://utilibre.org';
const dir='/opt/utilibre/reports/creative-batch-20261011';
const browser=await chromium.launch({args:['--no-sandbox']});
const report={date:new Date().toISOString(),environment:'Linux Chromium; 1366px desktop and 390px mobile emulation, not physical devices',checks:[],errors:[],external:[]};
try {
 for(const [lang,width] of [['en',1366],['es',390]]){
  const context=await browser.newContext({viewport:{width,height:844}});
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==root)report.external.push(new URL(r.url()).origin);});
  for(const path of ['/'+lang+'/?view=public', '/'+lang+'/?view=accounts','/'+lang+'/?view=pilots','/'+lang+'/'+(lang==='en'?'guides/html-page':'guias/pagina-html')]){
   const response=await page.goto(root+path,{waitUntil:'networkidle'});assert.equal(response.status(),200);
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
   assert.equal(await page.locator('h1').count(),1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow: '+path);
   if(path.includes('view=public'))assert(await page.locator('a[href^="https://vvveb.utilibre.org/"]').count()>0);
   if(path.includes('view=accounts'))assert(await page.locator('a[href^="https://grist.utilibre.org/"]').count()>0);
   if(path.includes('view=pilots')){
    assert.match(await page.locator('body').innerText(),/microStudio/);
    assert.equal(await page.locator('a[href^="https://microstudio.utilibre.org/"]').count(),0);
   }
   if(path.includes('html-page')||path.includes('pagina-html')){
    assert(await page.locator('a[href^="https://vvveb.utilibre.org/"]').count()>0);
    await page.screenshot({path:dir+'/portal-'+lang+'-guide.png',fullPage:true});
   }
   report.checks.push(path+': initial HTML, language, heading, layout and contextual link passed');
  }
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);
} finally {
 await browser.close();await writeFile(dir+'/portal.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}

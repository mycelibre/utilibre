// Run inside the candidate's network-none namespace. Public copy only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../../../portal/node_modules/playwright-core/index.mjs';
const root='/var/lib/utilibre-maintenance/vikunja-upgrade-20261112';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),rows=[];
try{
 for(const [language,path,term]of [['en','/en/guides/tasks-export','Trash'],['es','/es/guias/exportar-tareas','Papelera']]){
  for(const width of [1365,390]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],outside=[];
   page.on('pageerror',e=>errors.push(e.name));page.on('request',r=>{if(new URL(r.url()).hostname!=='127.0.0.1')outside.push(new URL(r.url()).origin);});
   const response=await page.goto('http://127.0.0.1:8080'+path);assert.equal(response.status(),200);
   await page.getByRole('heading',{level:1}).waitFor();assert((await page.locator('body').innerText()).includes(term));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.equal(await page.locator('html').getAttribute('lang'),language);
   assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://utilibre.org'+path);
   await page.screenshot({path:root+'/portal-'+language+'-'+width+'.png',fullPage:true});assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
   rows.push({language,width,path,passed:true});await context.close();
  }
 }
 fs.writeFileSync(root+'/portal-browser.json',JSON.stringify({passed:true,date:new Date().toISOString(),browser:browser.version(),rows,network:'none',deviceCoverage:'Desktop Chromium; mobile viewport emulation, not hardware'},null,2)+'\n');
}finally{await browser.close();}

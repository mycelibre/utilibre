// Fictional pattern settings, disposable browser contexts; no accounts or server data.
import assert from 'node:assert/strict';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]??'http://127.0.0.1:4196/';const dir='/opt/utilibre/reports/knit-newton-20261009';await mkdir(dir,{recursive:true,mode:0o700});
const browser=await chromium.launch();const results=[];
try{for(const [locale,width] of [['en-GB',1280],['es-GT',390]]){
 const c=await browser.newContext({locale,viewport:{width,height:950},isMobile:width===390,hasTouch:width===390});const p=await c.newPage();p.setDefaultTimeout(12000);const requests=[],errors=[];p.on('request',r=>requests.push(r.url()));p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
 await p.locator('#patternFactoryInputPattern').selectOption('Cables');const count=p.locator('[id="patternFactoryInputCable Count"]');await count.fill('6');await p.locator('#knitButton').click();await p.locator('#buttonNext').click();await p.locator('#buttonNext').click();const saved=p.url();assert(saved.includes('row=2'));assert(decodeURIComponent(saved).includes('Cable Count=6'));
 const before=await p.locator('.row.highlight').innerText();assert(before.length>0);await p.locator('summary').click();assert(await p.locator('[lang="es"]').isVisible());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:`${dir}/knit-${locale}.png`});
 assert.deepEqual(await p.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);assert(requests.every(u=>new URL(u).origin===new URL(base).origin));await c.close();
 const fresh=await browser.newContext({locale,viewport:{width,height:950}});const q=await fresh.newPage();await q.goto(saved);assert.equal(await q.locator('.row.highlight').innerText(),before);await q.locator('#configureButton').click();assert.equal(await q.locator('[id="patternFactoryInputCable Count"]').inputValue(),'6');await q.goto(base);assert.equal(await q.locator('[id="patternFactoryInputCable Count"]').inputValue(),'5');
 results.push({locale,width,nativeDesignAndRow:true,fullUrlFreshContextRestore:true,removeFragmentResets:true,noHorizontalOverflow:true,requests,externalRequests:[],errors});await fresh.close();
}await writeFile(`${dir}/knit-results.json`,JSON.stringify({date:new Date().toISOString(),base,results},null,2));console.log('PASS Knit native design, row progress, independent URL reopen, reset and no external requests at desktop/390px.');}finally{await browser.close();}

import assert from 'node:assert/strict';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch(),context=await browser.newContext(),page=await context.newPage();
try{
 await page.goto('https://drop.utilibre.org/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const responses=[];page.on('response',r=>{if(r.request().method()==='POST')responses.push({status:r.status(),worker:r.fromServiceWorker()})});
 const response=await page.evaluate(async()=>{const f=new FormData();f.set('allfiles',new File(['Fictional share test'],'synthetic-share.txt',{type:'text/plain'}));return(await fetch('/',{method:'POST',body:f,redirect:'manual'})).type});
 assert.equal(response,'opaqueredirect');assert(responses.some(r=>r.worker),'POST must be intercepted by native worker');
 const queued=await page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('pairdrop_store');req.onerror=reject;req.onsuccess=()=>{const db=req.result,r=db.transaction('share_target_files').objectStore('share_target_files').getAll();r.onsuccess=()=>{resolve(r.result.map(x=>({name:x.name,text:new TextDecoder().decode(x.buffer)})));db.close()}}}));
 assert.deepEqual(queued,[{name:'synthetic-share.txt',text:'Fictional share test'}]);await page.goto('https://drop.utilibre.org/?share_target=files');
 await page.waitForFunction(()=>new Promise(resolve=>{const req=indexedDB.open('pairdrop_store');req.onsuccess=()=>{const db=req.result,r=db.transaction('share_target_files').objectStore('share_target_files').count();r.onsuccess=()=>{resolve(r.result===0);db.close()}}}));
 const body=await page.locator('body').innerText();assert(/file|archivo/i.test(body));
 // A lost signaling connection is shown natively, without guessing its cause.
 await context.setOffline(true);await page.waitForTimeout(1000);console.log(JSON.stringify({at:new Date().toISOString(),result:'PASS',checks:['native share POST intercepted by active worker','exact file bytes queued in browser','queue consumed by receiving page'],limitations:['programmatic POST emulation, not OS share menu','no peer selected or file sent by this test','text target puts content in query; no portal receiver added','missing worker may send POST to server']}));
}finally{await browser.close()}

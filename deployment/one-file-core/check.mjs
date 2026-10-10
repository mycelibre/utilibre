// Only disposable browser contexts and fictional downloaded documents are used.
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base=process.argv[2]??'https://one-file.invalid/';
const report='/opt/utilibre/reports/single-file-20261009';
await mkdir(report,{recursive:true,mode:0o700});
const browser=await chromium.launch();const results=[];
async function context(locale,width=1280){
 const c=await browser.newContext({locale,viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390,acceptDownloads:true,serviceWorkers:'block'});
 const requests=[],outside=[],errors=[];
 c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await c.route(/^https?:/,async route=>{
  const u=new URL(route.request().url());requests.push({url:u.href,method:route.request().method()});
  if(u.origin!==new URL(base).origin){outside.push(u.href);return route.abort();}
  if(u.hostname==='one-file.invalid')return route.fulfill({path:'/opt/utilibre/build-one-file-core/'+(u.pathname==='/'?'index.html':u.pathname.split('/').pop()),contentType:u.pathname.endsWith('.download')?'application/octet-stream':u.pathname.endsWith('.txt')?'text/plain':'text/html'});
  return route.continue();
 });return {c,requests,outside,errors};
}
try {
 for(const [locale,width] of [['en-GB',1280],['es-GT',390]]){
  const s=await context(locale,width);const p=await s.c.newPage();await p.goto(base+(locale.startsWith('es')?'es/':''));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const original=p.waitForEvent('download');await p.locator('a[download]').click();const file=`${report}/core-${locale}-start.html`;await(await original).saveAs(file);
  await p.goto('file://'+file);assert(await p.locator('#encrypt-toggle').isDisabled());await p.locator('#welcome-skip-btn').click();if(!await p.locator('#add-node-btn').isVisible())await p.locator('#mobile-menu-toggle').click();await p.locator('#add-node-btn').click();
  const name=`Fictional router ${locale} </script><marker>`;
  await p.locator('#new-node-name').fill(name);await p.locator('#new-node-ip').fill('192.0.2.12');await p.locator('#add-node-save').click();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const d=p.waitForEvent('download');await p.locator('#save-file-btn').click();const saved=`${report}/core-${locale}-saved.html`;await(await d).saveAs(saved);
  const text=await readFile(saved,'utf8');assert(!text.includes('</script><marker>'));assert(text.includes('\\u003c/script>'));assert(text.includes("connect-src 'none'"));
  await p.screenshot({path:`${report}/core-${locale}-${width}.png`});
  // Native autosave is periodic; inspect only this synthetic document's draft.
  if(width===1280){await p.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('TheOneFileAutosave',1);r.onsuccess=()=>{const db=r.result;if(!db.objectStoreNames.contains('drafts')){db.close();resolve(false);return;}const q=db.transaction('drafts').objectStore('drafts').get('currentDraft');q.onsuccess=()=>{const ok=Object.values(q.result?.nodeData??{}).some(n=>n.ip==='192.0.2.12');db.close();resolve(ok);};};}),{},{timeout:40000});}
  assert.deepEqual(s.outside,[]);assert.deepEqual(s.errors,[]);await s.c.close();
  const reopened=await context(locale,width);const q=await reopened.c.newPage();await q.goto('file://'+saved);
  assert(await q.evaluate(n=>Object.values(NODE_DATA).some(x=>x.name===n),name));
  if(!await q.locator('#settings-btn').isVisible())await q.locator('#mobile-menu-toggle').click();await q.locator('#settings-btn').click();await q.locator('#clear-all-btn').click();await q.locator('#clear-all-confirm').click();assert.equal(await q.evaluate(()=>Object.keys(NODE_DATA).length),0);
  assert.deepEqual(reopened.outside,[]);assert.deepEqual(reopened.errors,[]);
  results.push({locale,width,downloadEditSaveReopen:true,scriptTextRoundTrip:true,noHorizontalOverflow:true,nativeClearAll:true,unsafeEncryptionCreationDisabled:true,cspPreserved:true,indexedDbAutosaveChecked:width===1280,requests:s.requests,externalRequests:[...s.outside,...reopened.outside],errors:[...s.errors,...reopened.errors]});await reopened.c.close();
 }
 await writeFile(`${report}/core-results.json`,JSON.stringify({date:new Date().toISOString(),base,results},null,2));console.log('PASS Core desktop/mobile native download, edit, save, independent reopen, text escaping, browser autosave and clear; no external requests.');
}finally{await browser.close();}

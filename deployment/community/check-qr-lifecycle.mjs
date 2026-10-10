import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
// Disposable loopback origin. Stage the retained previous image separately after a
// production upgrade; never downgrade production merely to run this check.
// Both ports must be loopback staging ports, never a production downgrade.
const previousVersion = process.env.QR_PREVIOUS_VERSION || 'p3';
const nextVersion = process.env.QR_NEXT_VERSION || 'p4';
const previousPort = Number(process.env.QR_PREVIOUS_PORT);
const nextPort = Number(process.env.QR_NEXT_PORT || 3181);
for (const port of [previousPort, nextPort]) assert(Number.isInteger(port) && port > 1024 && port <= 65535, 'Set QR_PREVIOUS_PORT and QR_NEXT_PORT to the loopback staging ports');
assert.notEqual(previousPort, nextPort, 'Use separate previous/candidate containers');
let next = false, interrupt = false;
const proxy = createServer((req,res) => {
  if (interrupt && req.url.includes('utilibre-offline.js')) { res.writeHead(503); return res.end(); }
  const up = request({host:'127.0.0.1',port:next?nextPort:previousPort,path:req.url,method:req.method,headers:req.headers}, r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});
  up.on('error',()=>{res.writeHead(502);res.end()});req.pipe(up);
});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(); const origin=`http://127.0.0.1:${proxy.address().port}`;
try {
  const context=await browser.newContext(), page=await context.newPage();
  await page.goto(origin+'/?lang=en',{waitUntil:'networkidle'}); await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);
  assert((await page.evaluate(()=>caches.keys())).some(k=>k.includes(previousVersion)));
  next=true; await page.evaluate(async()=>{const r=await navigator.serviceWorker.ready;await r.update()});
  await page.waitForFunction(async version=> (await caches.keys()).some(k=>k.includes(version)), nextVersion);
  await page.reload({waitUntil:'networkidle'}); await page.locator('#offline-controls').waitFor();
  await context.setOffline(true); await page.close(); const offline=await context.newPage();
  await offline.goto(origin+'/?lang=en'); await offline.locator('[data-type=text]').click();
  await offline.locator('#qrForm textarea').fill('Fictional offline practice'); await offline.locator('#generateBtn').click();
  await offline.waitForFunction(()=>document.querySelector('.qr-image')?.naturalWidth>0);
  for(const format of ['PNG','SVG','PDF']) {const event=offline.waitForEvent('download');await offline.locator('#export'+format).click();assert.equal(await(await event).failure(),null)}
  await offline.evaluate(()=>{localStorage.setItem('qr-history','[]');localStorage.setItem('synthetic-preference','keep')});
  offline.on('dialog',d=>d.accept()); await offline.getByRole('button',{name:'Remove offline assets only'}).click();
  await offline.waitForFunction(async()=> (await caches.keys()).length===0);
  assert.equal(await offline.evaluate(()=>localStorage.getItem('qr-history')),'[]'); assert.equal(await offline.evaluate(()=>localStorage.getItem('synthetic-preference')),'keep');
  await context.close();
  interrupt=true; const fresh=await browser.newContext();const p=await fresh.newPage();await p.goto(origin+'/?lang=en');
  await p.waitForTimeout(2000); assert.equal(await p.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.active),false,'Incomplete install must not become active');
  interrupt=false; await p.reload({waitUntil:'networkidle'}); await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.active);await p.reload();await fresh.setOffline(true);await p.reload();await p.locator('#offline-controls').waitFor();await fresh.close();
  console.log(JSON.stringify({at:new Date().toISOString(),result:'PASS',checks:[`${previousVersion} to ${nextVersion} update`,'disconnected fresh tab','text QR with PNG/SVG/PDF downloads','asset-only removal preserves storage','interrupted install does not activate','retry installs successfully'],environment:'Chromium loopback staging; not OS installation'}));
} finally {await browser.close();proxy.closeAllConnections();await new Promise(r=>proxy.close(r))}

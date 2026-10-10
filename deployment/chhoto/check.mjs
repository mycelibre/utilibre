import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const base = process.env.CHHOTO_TEST_URL || 'https://links.utilibre.org';
const report = '/opt/utilibre/reports/new-services-20261009';
const browser = await chromium.launch();
try {
 const context = await browser.newContext({viewport:{width:390,height:844}}); const page = await context.newPage();
 const errors=[]; const outside=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==new URL(base).origin)outside.push(u.origin)});
 await page.goto(base); await page.waitForLoadState('networkidle');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 const prior=await readFile(`${report}/chhoto-fixture.json`,'utf8').then(JSON.parse).catch(()=>null);
 const slug=prior?.slug||('utilibre-qa-'+randomBytes(6).toString('hex'));
 const dest='https://utilibre.org/en/?fictional=shortener-check';
 const request=async(path,data,method)=>page.evaluate(async({path,data,method})=>{
  const r=await fetch(path,{method:method||(data?'POST':'GET'),headers:{'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.text()};
 },{path,data,method});
 let r; if(!prior) { r=await request('/api/new',{shortlink:slug,longlink:dest,expiry_delay:2592001}); assert.equal(r.status,201,r.body); }
 await writeFile(`${report}/chhoto-fixture.json`,JSON.stringify({slug,dest,created:Date.now()}),{mode:0o600});
 r=await request('/api/all');assert([401,403].includes(r.status));
 r=await request('/api/del/'+slug,undefined,'DELETE');assert([401,403].includes(r.status));
 const redirect=await context.request.get(base+'/'+slug,{maxRedirects:0});assert.equal(redirect.status(),307);assert.equal(redirect.headers().location,dest);
 const password=JSON.parse(await readFile('/opt/utilibre/chhoto-private/operator.json','utf8')).password;
 r=await request('/api/login',{password,remember:false});assert.equal(r.status,200,r.body);
 const cookies=await context.cookies();assert(cookies.some(c=>c.secure&&c.httpOnly));
 r=await request('/api/all?filter='+slug);assert.equal(r.status,200,r.body);const info=JSON.parse(r.body).find(x=>x.shortlink===slug);assert(info);assert.equal(info.longlink,dest);assert.equal(info.hits,0);assert(info.expiry_time<=Math.floor(Date.now()/1000)+2592000&&info.expiry_time>Math.floor(Date.now()/1000)+2505600);
 await page.screenshot({path:`${report}/chhoto-mobile.png`,fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
 console.log('Public browser: create, maximum expiry, denied anonymous listing/deletion, exact307 destination, zero clicks, secure native login, mobile/local assets passed. Owned fixture retained for restore check.');
 await context.close();
} finally {await browser.close()}

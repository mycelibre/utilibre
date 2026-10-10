import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const out='/opt/utilibre/reports/trip-20261009',priv='/opt/utilibre/trip/private',base='http://127.0.0.1:3224';
const browser=await chromium.launch({args:['--no-sandbox']});
const saved=JSON.parse(await readFile(priv+'/browser-0.json','utf8'));
// Reuse this test account's native tokens on the local preview origin only.
const previewState={...saved,origins:saved.origins.map(origin=>origin.origin==='https://trip.utilibre.org'?{...origin,origin:base}:origin)};
const ctx=await browser.newContext({storageState:previewState,viewport:{width:1280,height:900},serviceWorkers:'block'});
await ctx.route('https://tile.openstreetmap.org/**',r=>r.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMXsAAAAASUVORK5CYII=','base64')}));
const session=JSON.parse(await readFile(priv+'/session-0.json','utf8')),headers={Authorization:'Bearer '+session.token};
const req=async(path,method='GET',data)=>{await new Promise(r=>setTimeout(r,230));const res=await ctx.request.fetch(base+path,{method,headers,data});assert(res.ok(),path+' '+res.status());return res.json()};
let id;const errors=[];
try {
 const category=(await req('/api/categories'))[0];
 const place=await req('/api/places','POST',{name:'<b data-utilibre-probe="place">Fictional marker</b>',place:'Fictional',lat:48.107,lng:-2.988,category_id:category.id});id=place.id;
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('.leaflet-marker-icon[title*="Fictional marker"]').hover();
 await page.locator('.leaflet-tooltip').waitFor();assert.equal(await page.locator('.leaflet-tooltip [data-utilibre-probe]').count(),0);assert((await page.locator('.leaflet-tooltip').innerText()).includes('<b data-utilibre-probe="place">Fictional marker</b>'));
 assert(await page.getByRole('link',{name:'Fix the map',exact:true}).count());await page.screenshot({path:out+'/escaped-marker.png'});
 await writeFile(out+'/render-regression.json',JSON.stringify({literalMarkupTooltip:true,attributionFixMap:true,errors},null,2));console.log('Native Leaflet tooltip renders fictional markup as text; attribution link present.');
}finally{if(id)await req('/api/places/'+id,'DELETE');await browser.close();}

// Pinned p1 -> p2 native service-worker update in a disposable localhost profile.
// No production browser cache, saved work or real account is accessed.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir,stat} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const temp=await mkdtemp('/opt/utilibre/trip-worker-update-'),out='/opt/utilibre/reports/trip-rendering-20261009';
for(const v of ['p1','p2']){const name='utilibre-trip-worker-copy-'+v;execFileSync('docker',['create','--network','none','--name',name,'utilibre-trip:1.50.1-'+v],{stdio:'ignore'});try{await mkdir(temp+'/'+v);execFileSync('docker',['cp',name+':/app/frontend/.',temp+'/'+v])}finally{execFileSync('docker',['rm',name],{stdio:'ignore'})}}
const targetHash=createHash('sha1').update(JSON.stringify(JSON.parse(await readFile(temp+'/p2/ngsw.json','utf8')))).digest('hex');
let version='p1';const events=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;events.push({version,path:pathname});if(pathname.startsWith('/api/')){const up=http.request({hostname:'127.0.0.1',port:3224,path:req.url,method:req.method},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res)});up.on('error',()=>{res.writeHead(502);res.end()});req.pipe(up);return}
 try{let file=path.join(temp,version,pathname);assert(file.startsWith(temp+'/'+version+'/'));if(!(await stat(file).catch(()=>null))?.isFile())file=temp+'/'+version+'/index.html';const body=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://tile.openstreetmap.org; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"});res.end(body)}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(43219,'127.0.0.1',r));const base='http://127.0.0.1:43219';const browser=await chromium.launch(),ctx=await browser.newContext({serviceWorkers:'allow'});const result={checkedAt:new Date().toISOString(),environment:'disposable local origin, real p1/p2 assets and native Angular worker'};
try{let page=await ctx.newPage();await page.goto(base+'/auth');await page.getByRole('button',{name:/Sign in/}).waitFor();await page.evaluate(()=>{localStorage.setItem('TRIP_DARK_MODE','true');localStorage.setItem('TRIP_VIEW_PREFS',JSON.stringify({panelWidth:360,showDayNotes:true}))});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);assert.equal(await page.locator('link[rel=stylesheet]').first().getAttribute('media'),'print');result.oldAppControlledByWorker=true;
 version='p2';await page.reload();await page.getByRole('button',{name:/Sign in/}).waitFor();result.firstReloadMedia=await page.locator('link[rel=stylesheet]').first().getAttribute('media');
 // Let Angular's normal idle update queue run. Repeated network polling would
 // postpone that queue, so inspect the debug state only after idle intervals.
 let workerState='';
 for(let attempt=0;attempt<6;attempt++){
  await new Promise(r=>setTimeout(r,5500));
  workerState=await page.evaluate(async()=>(await(await fetch('/ngsw/state')).text()));
  if(workerState.includes('Latest manifest hash: '+targetHash))break;
 }
 assert(workerState.includes('Latest manifest hash: '+targetHash),workerState);result.newVersionInstalled=true;
 await page.close();page=await ctx.newPage();await page.goto(base+'/auth');await page.getByRole('button',{name:/Sign in/}).waitFor();await writeFile(out+'/service-worker-probe.json',JSON.stringify({targetHash,firstReloadMedia:result.firstReloadMedia,workerState:await page.evaluate(async()=>(await(await fetch('/ngsw/state')).text())),media:await page.locator('link[rel=stylesheet]').first().getAttribute('media'),html:await page.content(),events},null,2));assert.notEqual(await page.locator('link[rel=stylesheet]').first().getAttribute('media'),'print');assert.deepEqual(await page.evaluate(()=>({dark:localStorage.getItem('TRIP_DARK_MODE'),prefs:JSON.parse(localStorage.getItem('TRIP_VIEW_PREFS'))})),{dark:'true',prefs:{panelWidth:360,showDayNotes:true}});result.reopenedTabUsesFixedStyles=true;result.nativePreferencesPreserved=true;result.noUnregisterOrStorageClear=true;await page.screenshot({path:out+'/service-worker-reopened.png'});await writeFile(out+'/service-worker-result.json',JSON.stringify({...result,events},null,2)+'\n');console.log(JSON.stringify(result,null,2));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true})}

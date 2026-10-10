// One bounded native public view per reader, never a loop or upstream load test.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';

const output='/opt/utilibre/reports/frontend-reliability-20261009';
const tabsOnly=process.argv.includes('--breezewiki-tabs-only');
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try {
  for(const [name,url] of [
    ['rimgo','https://rimgo.utilibre.org/wG1nGfK'],
    ['breezewiki','https://wiki.utilibre.org/zelda/wiki/Link'],
  ]) {
    if(tabsOnly&&name!=='breezewiki')continue;
    const origin=new URL(url).origin;
    const context=await browser.newContext({viewport:{width:1280,height:844},serviceWorkers:'block'});
    const page=await context.newPage(),responses=[],pageErrors=[],blocked=[];
    const cdp=await context.newCDPSession(page),requests=new Map();
    await cdp.send('Network.enable');
    cdp.on('Network.requestWillBeSent',event=>requests.set(event.requestId,event.request.url));
    cdp.on('Network.loadingFailed',event=>{if(event.blockedReason)blocked.push({url:requests.get(event.requestId),reason:event.blockedReason})});
    page.on('pageerror',error=>pageErrors.push({message:error.message,stack:error.stack}));
    page.on('response',response=>responses.push({url:response.url(),status:response.status(),type:response.headers()['content-type']}));
    // Read only the first media resource. The other image slots are deliberately
    // untested; requesting an article's entire image collection adds no evidence.
    let mediaAllowed=0,fixtureAborts=0;
    const wantedMedia=name==='rimgo'?origin+'/wG1nGfK.mp4':origin+JSON.parse(await readFile(output+'/breezewiki-images.json','utf8')).find(image=>image.src?.startsWith('/proxy?')).src;
    await context.route('**/*',async route=>{
      const request=route.request(),parsed=new URL(request.url());
      const media=parsed.origin===origin&&['image','media'].includes(request.resourceType())&&!parsed.pathname.startsWith('/static/');
      if(tabsOnly&&media)return route.fulfill({status:403,contentType:'text/plain',body:'Previously recorded upstream refusal; no repeated media request in this script-only regression.'});
      if(media&&(request.url()!==wantedMedia||mediaAllowed++>=1)){fixtureAborts++;return route.abort('blockedbyclient')}
      return route.continue();
    });
    const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:40000});
    assert.equal(response.status(),200);
    if(tabsOnly)await page.waitForFunction(()=>!document.body.classList.contains('bw-tabs-nojs'));
    let media;
    if(name==='rimgo') {
      const video=page.locator('video').first();await video.waitFor();
      media=await video.evaluate(async element=>{
        if(!element.error&&element.readyState<1)await new Promise(resolve=>{const finish=()=>resolve();element.addEventListener('error',finish,{once:true});element.addEventListener('loadedmetadata',finish,{once:true});setTimeout(finish,5000)});
        return {readyState:element.readyState,errorCode:element.error?.code??null,duration:Number.isFinite(element.duration)?element.duration:null};
      });
    } else {
      assert.match(await page.locator('#content').innerText(),/Link/);
      const img=page.locator('img[src^="/proxy?"]').first();await img.waitFor();
      media=await img.evaluate(async element=>{
        if(!element.complete)await new Promise(resolve=>{element.addEventListener('load',resolve,{once:true});element.addEventListener('error',resolve,{once:true});setTimeout(resolve,5000)});
        return {complete:element.complete,naturalWidth:element.naturalWidth};
      });
    }
    await page.screenshot({path:output+'/'+name+(tabsOnly?'-p3':'')+'-public.png'});
    const externalResponses=responses.filter(r=>new URL(r.url).origin!==origin);
    assert.deepEqual(externalResponses,[],'No third-party browser response should be fetched');
    if(tabsOnly)assert.deepEqual(pageErrors,[]);
    results.push({name,checkedAt:new Date().toISOString(),articleStatus:response.status(),media,mediaRefusalReplayedWithoutUpstreamRequest:tabsOnly,mediaResponses:responses.filter(r=>r.status>=400),fixtureAborts,externalResponses,blockedByBrowserPolicy:blocked.filter(b=>b.reason==='csp'),pageErrors});
    await context.close();
  }
} finally {await browser.close()}
await writeFile(output+(tabsOnly?'/breezewiki-p3-public-browser.json':'/public-browser.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify(results.map(({name,articleStatus,media,externalResponses})=>({name,articleStatus,media,externalResponses})),null,2));

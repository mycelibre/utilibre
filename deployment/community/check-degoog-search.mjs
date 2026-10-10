import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin='https://degoog.utilibre.org';
const output=process.env.DEGOOG_CHECK_REPORT??'/opt/utilibre/reports/degoog-search-20261009';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const checksOnly=process.argv.includes('--checks-only');
const reports=checksOnly?JSON.parse(await readFile(`${output}/browser-progress.json`,'utf8')):[];
try{
  for(const [name,width,locale,query,returning] of checksOnly?[]:[
    ['desktop',1280,'en','how to boil eggs',false],
    ['mobile',390,'es','Guatemala turismo',false],
    ['narrow-returning',320,'es','privacidad digital',true],
  ]){
    const context=await browser.newContext({viewport:{width,height:900},locale});
    const page=await context.newPage(),external=new Set(),errors=[],responses=[];
    context.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.add(new URL(r.url()).origin)});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{const path=new URL(r.url()).pathname;responses.push({path,status:r.status});});
    assert.equal((await page.goto(origin,{waitUntil:'networkidle'})).status(),200);
    if(returning){
      // Disposable browser only: preserve the previous three-engine preferences,
      // including a deliberate disabled engine, when the fourth engine arrives.
      await page.evaluate(()=>new Promise((resolve,reject)=>{
        const r=indexedDB.open('degoog',2);r.onerror=()=>reject(r.error);
        r.onsuccess=()=>{const db=r.result,t=db.transaction('settings','readwrite');t.objectStore('settings').put({'searx-mwmbl-engine':false,'searx-openlibrary-engine':true,'searx-hackernews-engine':true},'engines');t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)};
      }));await page.reload({waitUntil:'networkidle'});
    }
    await page.locator('#search-input').fill(query);const start=Date.now();await page.locator('#btn-search').click();
    await page.locator('#results-list a.result-title').first().waitFor({timeout:20000});
    await page.waitForTimeout(4500);
    if(await page.locator('#results-list img[src*="/api/proxy/image"]').count())await page.waitForFunction(()=>[...document.querySelectorAll('#results-list img')].some(e=>e.currentSrc.includes('/api/proxy/image')&&e.naturalWidth>0),{},{timeout:20000});
    const result=await page.locator('#results-list a.result-title').evaluateAll(es=>es.map(e=>({title:e.textContent,url:e.href})));
    const body=await page.locator('body').innerText();
    assert.ok(result.length>=10,JSON.stringify({name,count:result.length,body}));
    assert.ok(body.includes('Google Cse'));
    assert.ok(!result.some(x=>new URL(x.url).hostname==='openlibrary.org'),'Books must not fill Web results');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual([...external],[]);assert.deepEqual(errors,[]);
    const unexpected=responses.filter(r=>r.status>=400&&!(r.status===404&&r.path==='/api/proxy/favicon'));
    assert.deepEqual(unexpected,[]);
    if(returning){
      const saved=await page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('degoog',2);r.onsuccess=()=>{const db=r.result,q=db.transaction('settings').objectStore('settings').get('engines');q.onsuccess=()=>{resolve(q.result);db.close()};q.onerror=()=>reject(q.error)}}));
      assert.equal(saved['searx-mwmbl-engine'],false);assert.ok(!body.includes('Mwmbl\n'));
    }
    await page.screenshot({path:`${output}/after-${name}.png`});
    reports.push({name,query,locale,count:result.length,elapsedMs:Date.now()-start,first:result.slice(0,5),external:[...external],errors,proxiedImages:responses.filter(x=>x.path==='/api/proxy/image'&&x.status===200).length});
    await writeFile(`${output}/browser-progress.json`,JSON.stringify(reports,null,2)+'\n');
    await context.close();await new Promise(r=>setTimeout(r,2000));
  }
  const checks=[];
  for(const [query,type,lang] of [['weather Berlin','web','en'],['cómo cocer huevos','web','es'],['Don Quijote','books','es'],['javascript','it','en']]){
    const start=Date.now(),r=await fetch(`${origin}/api/search`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query,type,lang}),signal:AbortSignal.timeout(25000)});assert.equal(r.status,200,`Native API status ${r.status} for ${query}`);const d=await r.json();
    assert.equal(r.status,200);assert.ok(d.results.length>=5,JSON.stringify(d));
    if(type==='web'){assert.ok(d.engineTimings.some(e=>e.id==='searx-google_cse-engine'&&e.status==='ok'&&e.resultCount>=5));assert.ok(!d.engineTimings.some(e=>e.id==='searx-openlibrary-engine'))}
    if(type==='books')assert.deepEqual(d.engineTimings.map(e=>e.id),['searx-openlibrary-engine']);
    if(type==='it')assert.deepEqual(d.engineTimings.map(e=>e.id),['searx-hackernews-engine']);
    checks.push({query,type,lang,status:r.status,count:d.results.length,elapsedMs:Date.now()-start,timings:d.engineTimings,first:d.results.slice(0,3).map(x=>({title:x.title,url:x.url}))});
    await writeFile(`${output}/api-progress.json`,JSON.stringify(checks,null,2)+'\n');
    await new Promise(r=>setTimeout(r,6000));
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,locale:'en'}),page=await nojs.newPage();
  const nr=await page.goto(`${origin}/nojs/search?q=how%20to%20boil%20eggs&lang=en`,{waitUntil:'domcontentloaded'});
  assert.equal(nr.status(),200);assert.ok((await page.locator('body').innerText()).includes('Google Cse'));await page.goto(`${origin}/nojs`,{waitUntil:'domcontentloaded'});
  const form=page.locator('form').filter({has:page.locator('input[name=q]')}).first();
  await form.locator('input[name=q]').fill('how to boil eggs');
  await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),form.locator('button[type=submit]').first().click()]);
  assert.ok((await page.locator('body').innerText()).includes('Google Cse'));await nojs.close();
  const denied=[];for(const path of ['/api/settings','/settings/general','/api/store/repos','/api/indexer/export','/api/proxy/image?url=http%3A%2F%2F127.0.0.1%2F'])denied.push({path,status:(await fetch(origin+path)).status});
  assert.ok(denied.every(x=>[403,404].includes(x.status)));
  await writeFile(`${output}/public-results.json`,JSON.stringify({reports,checks,noJavaScript:true,denied},null,2)+'\n');
  console.log(JSON.stringify({browser:reports.map(x=>({name:x.name,count:x.count,images:x.proxiedImages,external:x.external})),api:checks.map(x=>({query:x.query,type:x.type,count:x.count,ms:x.elapsedMs})),noJavaScript:true,denied},null,2));
}finally{await browser.close()}

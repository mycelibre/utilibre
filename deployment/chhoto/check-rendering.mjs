// Verify public layout and one disposable native short link; never list stored links.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base='https://links.utilibre.org';
const report=process.env.REPORT_DIR || '/opt/utilibre/reports/chhoto-rendering-20261009';
await mkdir(report,{recursive:true,mode:0o700});
const browser=await chromium.launch();const results=[];
try {
  for(const [width,scheme] of [[1280,'light'],[390,'light'],[320,'dark']]) {
    const context=await browser.newContext({viewport:{width,height:900},colorScheme:scheme,permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();const errors=[],outside=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
    page.on('request',r=>{if(new URL(r.url()).origin!==base)outside.push(r.url())});
    await page.goto(base,{waitUntil:'networkidle'});
    const layout=await page.evaluate(()=>{
      const notes=document.querySelector('[name="links-div"]');const input=document.querySelector('#longUrl');const form=input.closest('form');
      return {position:getComputedStyle(notes).position,notesTop:notes.getBoundingClientRect().top,formBottom:form.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth,styles:[...document.styleSheets].map(s=>({href:s.href,rules:s.cssRules.length}))};
    });
    assert.equal(layout.position,'static');assert(layout.notesTop>=layout.formBottom);assert.equal(layout.overflow,false);assert(layout.styles.every(s=>s.rules>0));
    await page.screenshot({path:`${report}/after-${width}-${scheme}.png`,fullPage:true});
    await page.locator('#admin-button').click();await page.locator('#password').waitFor({state:'visible'});
    assert(await page.locator('#login-dialog').evaluate(e=>e.getBoundingClientRect().width<=innerWidth));
    await page.reload({waitUntil:'networkidle'});
    if(width===1280) {
      const slug='utilibre-qa-layout-'+randomBytes(6).toString('hex');
      const destination='https://utilibre.org/en/?fictional=layout-check';
      await writeFile(`${report}/fixture.json`,JSON.stringify({slug,destination}),{mode:0o600});
      await page.locator('#longUrl').fill(destination);await page.locator('#shortUrl').fill(slug);
      await page.getByText('More options',{exact:true}).click();await page.locator('#expiryDelay').selectOption('600');
      const created=page.waitForResponse(r=>r.url().endsWith('/api/new'));
      await page.getByRole('button',{name:'Shorten!',exact:true}).click();assert.equal((await created).status(),201);
      await page.waitForFunction(expected=>document.querySelector('#shortUrl')?.value==='' || navigator.clipboard.readText().then(v=>v===expected),base+'/'+slug);
      assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),base+'/'+slug);
      const redirect=await context.request.get(base+'/'+slug,{maxRedirects:0});assert.equal(redirect.status(),307);assert.equal(redirect.headers().location,destination);
      const password=JSON.parse(await readFile('/opt/utilibre/chhoto-private/operator.json','utf8')).password;
      assert.equal(await page.evaluate(async password=>(await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,remember:false})})).status,password),200);
      assert.equal(await page.evaluate(async slug=>(await fetch('/api/del/'+slug,{method:'DELETE'})).status,slug),200);
      assert.equal((await context.request.get(base+'/'+slug,{maxRedirects:0})).status(),404);
    }
    assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);results.push({width,scheme,layout,errors,outside});await context.close();
  }
  await writeFile(`${report}/public-result.json`,JSON.stringify({date:new Date().toISOString(),version:'7.8.3-p3',results,nativeCreateRedirectDelete:true},null,2));
  console.log('Public layouts at1280/390/320, light/dark, native login dialog, create/clipboard/307/delete404 passed; no outside assets or browser errors.');
} finally {await browser.close()}

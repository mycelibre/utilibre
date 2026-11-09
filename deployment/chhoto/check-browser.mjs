// Native UI checks on an isolated localhost application with fictional URLs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const [base,report,cid]=process.argv.slice(2),url=new URL(base);
assert.match(cid,/^[a-f0-9]{64}$/);assert.equal(url.protocol,'https:');
const nets=JSON.parse(execFileSync('docker',['inspect','--format','{{json .NetworkSettings.Networks}}',cid],{encoding:'utf8',timeout:10000}));
assert(Object.entries(nets).some(([name,v])=>name.startsWith('utilibre-chhoto-check-')&&v.IPAddress===url.hostname));
assert(report.startsWith('/var/lib/utilibre-maintenance/')&&!report.includes('..'));
fs.mkdirSync(report,{recursive:true,mode:0o700});
const browser=await chromium.launch(),rows=[];
try{
 for(const [width,scheme] of [[1280,'light'],[390,'light'],[320,'dark']]){
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width,height:900},colorScheme:scheme,permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage(),errors=[],outside=[];
  await context.route('**/*',async route=>{
   const target=new URL(route.request().url());
   if(target.origin!==url.origin){outside.push(target.origin);await route.abort();}
   else await route.continue();
  });
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'networkidle'});
  if(process.env.UTILIBRE_EXPECT_ABUSE==='1'){
   for(const path of ['/en/abuse','/es/denunciar-abuso']){
    const link=page.locator('a[href="https://utilibre.org'+path+'"]');
    assert.equal(await link.count(),1);assert(await link.isVisible());
    assert.equal(await link.getAttribute('referrerpolicy'),'no-referrer');
   }
   assert.equal(await page.locator('a[href^="mailto:admin@utilibre.org"]').count(),2);
  }
  const layout=await page.evaluate(()=>{
   const notes=document.querySelector('[name="links-div"]'),form=document.querySelector('#longUrl').closest('form');
   return {overflow:document.documentElement.scrollWidth>innerWidth,notesBelowForm:notes.getBoundingClientRect().top>=form.getBoundingClientRect().bottom,css:[...document.styleSheets].every(s=>s.cssRules.length>0)};
  });
  assert(!layout.overflow&&layout.notesBelowForm&&layout.css);
  if(width===1280){
   for(const custom of ['', 'clase-ejemplo']){
    await page.locator('#longUrl').fill('https://example.invalid/fictional-ui');
    await page.locator('#shortUrl').fill(custom);
    const pending=page.waitForResponse(r=>r.url().endsWith('/api/new'));
    await page.getByRole('button',{name:'Shorten!',exact:true}).click();
    const response=await pending;assert.equal(response.status(),201);
    const slug=(await response.text()).trim();
    assert(custom?slug===custom:/^[a-z0-9]{8}$/.test(slug));
    await page.waitForFunction(async expected=>(await navigator.clipboard.readText())===expected,base+'/'+slug);
    const r=await context.request.get(base+'/'+slug,{maxRedirects:0});
    assert.equal(r.status(),307);assert.equal(r.headers().location,'https://example.invalid/fictional-ui');
   }
  }
  await page.locator('#admin-button').click();await page.locator('#password').waitFor({state:'visible'});
  assert(await page.locator('#login-dialog').evaluate(e=>e.getBoundingClientRect().width<=innerWidth));
  await page.keyboard.press('Escape');
  await page.screenshot({path:report+`/${width}-${scheme}.png`,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  rows.push({width,scheme,...layout,errors,outside});await context.close();
 }
 fs.writeFileSync(report+'/result.json',JSON.stringify({passed:true,rows,automaticEightCharacter:true,customPhrase:true,clipboard:true,redirect:true,externalRequests:0,scope:'Chromium desktop and simulated narrow viewports behind existing gateway configuration with synthetic self-signed TLS; no real phone or public TLS test'},null,2)+'\n');
 console.log('Native shortener UI, clipboard and local assets passed at 1280/390/320 widths');
}finally{await browser.close();}

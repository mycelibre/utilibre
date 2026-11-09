// Native browser encryption over a loopback-only transport into the synthetic
// internal fixture. This is not a production proxy or integration endpoint.
import assert from 'node:assert/strict';import net from 'node:net';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {chromium} from '../../../portal/node_modules/playwright/index.mjs';
const [name]=process.argv.slice(2);assert.match(name,/^maintenance-yopass-[a-f0-9]{8}$/);
const info=JSON.parse(execFileSync('docker',['inspect',name],{encoding:'utf8'}))[0];
assert(Object.keys(info.NetworkSettings.Networks).includes(name));
const ip=info.NetworkSettings.Networks[name].IPAddress;
const proxy=net.createServer(client=>{const remote=net.connect(1337,ip);client.pipe(remote).pipe(client);remote.on('error',()=>client.destroy());client.on('error',()=>remote.destroy());client.on('close',()=>remote.destroy());});
await new Promise(r=>proxy.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+proxy.address().port,root='/var/lib/utilibre-maintenance/security-20261109/yopass';
const browser=await chromium.launch(),rows=[];
try{
 for(const [language,width] of [['en',1280],['es',390]]){
  const context=await browser.newContext({locale:language,viewport:{width,height:900}}),outside=[],errors=[],contentRequests=[];
  const plaintext='Fictional Utilibre sample '+language+' — ningún dato real.';
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin!==origin){outside.push(url.origin);await route.abort();return;}
   assert(!url.href.includes(encodeURIComponent(plaintext)));
   if(req.method()==='POST'){assert(!req.postData()?.includes(plaintext));contentRequests.push(url.pathname);}
   await route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  for(const path of ['/en/abuse','/es/denunciar-abuso'])assert(await page.locator('a[href="https://utilibre.org'+path+'"]').isVisible());
  await page.locator('#secret').fill(plaintext);await page.locator('form button[type="submit"]').click();
  const code=page.locator('code').filter({hasText:origin+'/#/s/'}).first();await code.waitFor();const link=(await code.textContent()).trim();
  assert.equal(new URL(link).origin,origin);assert(new URL(link).hash.split('/').length>=4);
  const reader=await browser.newContext({locale:language,viewport:{width,height:900}});
  await reader.route('**/*',async route=>{if(new URL(route.request().url()).origin!==origin){outside.push(route.request().url());await route.abort();}else await route.continue();});
  const second=await reader.newPage();second.on('pageerror',e=>errors.push(e.message));await second.goto(link,{waitUntil:'networkidle'});
  await second.getByRole('button',{name:language==='es'?'Revelar mensaje seguro':'Reveal Secure Message',exact:true}).click();
  await second.getByText(plaintext,{exact:true}).waitFor();
  assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);assert.deepEqual(contentRequests,['/create/secret']);
  assert(!await second.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await second.screenshot({path:root+'/browser-'+language+'.png',fullPage:true});
  rows.push({language,width,nativeEncryptDecrypt:true,independentRecipient:true,reportLinks:true,plaintextNotSent:true,outside,errors});
  await reader.close();await context.close();
 }
 fs.writeFileSync(root+'/browser.json',JSON.stringify({passed:true,rows,scope:'Chromium desktop and emulated narrow viewport; isolated synthetic data, no real-device coverage'},null,2)+'\n');
 console.log('Yopass native EN/ES browser encrypted sharing and report links passed');
}finally{await browser.close();await new Promise(r=>proxy.close(r));}

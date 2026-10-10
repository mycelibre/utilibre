import assert from 'node:assert/strict';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
const base=process.argv[2]||'http://127.0.0.1:4198/apps/kokoro-web/';
const output='/opt/utilibre/reports/kokoro-web-20261009';await mkdir(output,{recursive:true,mode:0o700});
const csp=(await readFile(new URL('./security.conf',import.meta.url),'utf8')).match(/Content-Security-Policy "([^"]+)"/)[1];
const report={time:new Date().toISOString(),base,requests:[],outside:[],errors:[],consoleErrors:[],checks:[]};
const local=process.argv[2]?null:createServer((req,res)=>{const name=path.join('/opt/utilibre/src/kokoro-web/build',new URL(req.url,base).pathname.replace(/^\/apps\/kokoro-web\//,'')||'index.html');const ext=path.extname(name);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.json':'application/json'})[ext]||'application/octet-stream');res.setHeader('Content-Security-Policy',csp);res.setHeader('Cross-Origin-Opener-Policy','same-origin');res.setHeader('Cross-Origin-Embedder-Policy','credentialless');createReadStream(name).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);});if(local)await new Promise(r=>local.listen(4198,'127.0.0.1',r));
const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:1280,height:1000},acceptDownloads:true,serviceWorkers:'block'});
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(!['http:','https:'].includes(u.protocol))return route.continue();report.requests.push({path:u.pathname,method:route.request().method()});if(u.origin!==new URL(base).origin){report.outside.push(u.href);return route.abort();}if(u.hostname==='kokoro.invalid')return route.fulfill({path:path.join('/opt/utilibre/src/kokoro-web/build',u.pathname.replace(/^\/apps\/kokoro-web\//,'')||'index.html'),headers:{'Content-Security-Policy':csp,'Cross-Origin-Opener-Policy':'same-origin','Cross-Origin-Embedder-Policy':'credentialless'}});return route.continue();});
 context.setDefaultTimeout(30000);const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'){report.consoleErrors.push(m.text());console.log('Browser error:',m.text().slice(0,350));}});page.on('dialog',async d=>{if(d.type()==='prompt')await d.accept('Fictional profile');else await d.accept();});
 await page.goto(base);await page.getByRole('button',{name:'Generate Voice',exact:true}).waitFor();
 await writeFile(output+'/initial-ui.txt',await page.locator('body').ariaSnapshot());
 for(const [lang,text,mobile] of [['en-us','Hello. This is a fictional sample.',false],['es-419','Hola. Esta es una prueba ficticia.',false],['es-419','Hola. Esta es una prueba ficticia.',true]]){
  if(mobile)await page.setViewportSize({width:375,height:812});
  await page.locator('fieldset').filter({has:page.locator('legend',{hasText:'Language accent (region)'})}).locator('select').selectOption(lang);
  await page.locator('textarea').fill(text);const start=Date.now();await page.getByRole('button',{name:'Generate Voice',exact:true}).click();
  await page.getByRole('button',{name:'Generate Voice',exact:true}).waitFor({state:'visible'});await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Generate Voice'))?.disabled,undefined,{timeout:120000});
  await page.getByRole('link',{name:'Download audio',exact:true}).waitFor({timeout:10000});const download=page.waitForEvent('download');await page.getByRole('link',{name:'Download audio',exact:true}).click();const dest=output+'/'+(mobile?'mobile-':'')+lang+'.wav';await(await download).saveAs(dest);const bytes=await readFile(dest);assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WAVE');assert(bytes.length>24000);assert.equal(bytes.readUInt32LE(24),24000);await page.getByRole('button',{name:'Play',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).waitFor();await page.getByRole('button',{name:'Pause',exact:true}).click();
  const audio=await page.evaluate(async values=>{const ac=new AudioContext();const data=await ac.decodeAudioData(new Uint8Array(values).buffer);const samples=data.getChannelData(0);let energy=0;for(const x of samples)energy+=x*x;const r={duration:data.duration,channels:data.numberOfChannels,sampleRate:data.sampleRate,rms:Math.sqrt(energy/samples.length)};await ac.close();return r;},[...bytes]);assert(audio.duration>1&&audio.rms>0.001);report.checks.push({lang,mobile,elapsedSeconds:(Date.now()-start)/1000,audio});
 }
 await page.getByRole('button',{name:'Save profile',exact:true}).click();assert((await page.evaluate(()=>localStorage.getItem('kokoro-web-profiles'))).includes('prueba ficticia'));
 await page.reload();await page.locator('fieldset').filter({has:page.locator('legend',{hasText:'Profile'})}).locator('select').selectOption('0');assert((await page.locator('textarea').inputValue()).includes('prueba ficticia'));
 await page.getByRole('button',{name:'Delete profile',exact:true}).click();assert.equal(await page.evaluate(()=>localStorage.getItem('kokoro-web-profiles')),'[]');await page.reload();assert(!(await page.locator('textarea').inputValue()).includes('prueba ficticia'));
 report.profiles={saveReload:true,deleteReload:true};report.caches=await page.evaluate(()=>caches.keys());await page.setViewportSize({width:375,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:output+'/mobile.png',fullPage:true});
 assert.deepEqual(report.outside,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert(report.requests.every(r=>r.method==='GET'));
}finally{await browser.close();if(local)await new Promise(r=>local.close(r));await writeFile(output+'/native-result.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS local EN/ES WAV generation, non-silent decoded audio, native profile save/delete/reload, mobile layout, no external requests/uploads.');

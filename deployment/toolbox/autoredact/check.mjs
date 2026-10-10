import assert from 'node:assert/strict';
import { chromium } from '../../../portal/node_modules/playwright/index.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const base=process.argv[2] || 'https://autoredact.invalid/apps/autoredact/';
const output='/opt/utilibre/reports/autoredact-20261009';
await mkdir(output,{recursive:true,mode:0o700});
const report={time:new Date().toISOString(),base,requests:[],outside:[],errors:[],consoleErrors:[],checks:[]};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'";
const browser=await chromium.launch();
try {
 for(const [name,locale,viewport] of [['desktop','en-US',{width:1280,height:900}],['mobile','es-ES',{width:375,height:812}]]) {
  const context=await browser.newContext({locale,viewport,acceptDownloads:true,serviceWorkers:'block'});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url()); if(!['http:','https:'].includes(u.protocol))return route.continue();
   report.requests.push({path:u.pathname,method:route.request().method()});
   if(u.origin!==new URL(base).origin){report.outside.push(u.href);return route.abort();}
   if(u.hostname==='autoredact.invalid')return route.fulfill({path:path.join('/opt/utilibre/src/autoredact/dist',u.pathname.replace(/^\/apps\/autoredact\//,'')||'index.html'),headers:{'Content-Security-Policy':csp}});
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
  await page.goto(base);await page.getByText('Drop images or PDFs here',{exact:true}).waitFor();
  const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=320;const d=c.getContext('2d');d.fillStyle='#fff';d.fillRect(0,0,900,320);d.fillStyle='#000';d.font='32px sans-serif';d.fillText('Fictional sample. Review every result.',35,55);d.fillText('Contact: sample@example.com',35,130);d.fillText('Server: 203.0.113.42',35,205);d.fillStyle='#24946d';d.fillRect(35,245,830,35);return c.toDataURL('image/png');});
  const fixtureBytes=Buffer.from(fixture.split(',')[1],'base64');await writeFile(output+'/fictional-input.png',fixtureBytes);
  await page.locator('input[type=file]').setInputFiles({name:'fictional.png',mimeType:'image/png',buffer:fixtureBytes});
  await page.getByRole('button',{name:'Download Redacted Image',exact:true}).waitFor({timeout:90000});
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download Redacted Image',exact:true}).click();const file=await download;await file.saveAs(output+'/'+name+'-redacted.png');
  const bytes=await readFile(output+'/'+name+'-redacted.png');
  const pixels=await page.evaluate(async values=>{const im=await createImageBitmap(new Blob([new Uint8Array(values)],{type:'image/png'}));const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const d=c.getContext('2d');d.drawImage(im,0,0);const data=d.getImageData(0,0,c.width,c.height).data;const at=(x,y)=>{const i=(y*c.width+x)*4;return [...data.slice(i,i+4)];};let solid=0;for(let x=220;x<430;x++)if(at(x,115).every((v,i)=>v===(i===3?255:0)))solid++;return{width:im.width,height:im.height,solidPixels:solid,untouched:at(50,260)};},[...bytes]);
  assert.equal(pixels.width,900);assert.equal(pixels.height,320);assert.equal(pixels.solidPixels,210);assert.deepEqual(pixels.untouched,[36,148,109,255]);
  await page.screenshot({path:output+'/'+name+'-result.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.getByRole('button',{name:'Process Another Image',exact:true}).click();await page.getByText('Drop images or PDFs here',{exact:true}).waitFor();
  await page.reload();await page.getByText('Drop images or PDFs here',{exact:true}).waitFor();
  report.checks.push({name,locale,pixels,resetClearsImage:true});await context.close();
 }
 assert.deepEqual(report.outside,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert(report.requests.every(r=>r.method==='GET'));
}finally{await browser.close();await writeFile(output+'/result.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS native local OCR, solid pixel replacement, desktop/mobile, reset and no external requests/uploads.');

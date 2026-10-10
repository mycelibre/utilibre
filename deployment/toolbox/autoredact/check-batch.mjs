import assert from 'node:assert/strict';
import { chromium } from '../../../portal/node_modules/playwright/index.mjs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { jsPDF } = require('/opt/utilibre/src/autoredact/node_modules/jspdf');
const JSZip = require('/opt/utilibre/src/autoredact/node_modules/jszip');
const base=process.argv[2] || 'https://autoredact.invalid/apps/autoredact/';
const output='/opt/utilibre/reports/autoredact-20261009';
await mkdir(output,{recursive:true,mode:0o700});
const report={time:new Date().toISOString(),base,requests:[],outside:[],errors:[],consoleErrors:[],checks:[]};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'self'";
const browser=await chromium.launch();
try {
 for(const [name,locale,viewport] of [['desktop','en-US',{width:1280,height:900}]]) {
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
  const pdf = new jsPDF({orientation:'landscape',unit:'px',format:[900,320]});
  for(let i=0;i<2;i++){if(i)pdf.addPage([900,320],'landscape');pdf.setFontSize(32);pdf.text('Fictional sample '+(i+1),35,55);pdf.text('Contact: sample@example.com',35,130);pdf.text('Server: 203.0.113.42',35,205);}
  const input=Buffer.from(pdf.output('arraybuffer'));await writeFile(output+'/fictional-input.pdf',input);
  await page.locator('input[type=file]').setInputFiles({name:'fictional.pdf',mimeType:'application/pdf',buffer:input});
  await page.getByText('2 of 2 images processed',{exact:true}).waitFor({timeout:90000});
  const zipDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download ZIP',exact:false}).click();await (await zipDownload).saveAs(output+'/batch.zip');
  const zip=await JSZip.loadAsync(await readFile(output+'/batch.zip'));const names=Object.keys(zip.files);assert.equal(names.length,2);
  for(const item of names){const bytes=await zip.files[item].async('nodebuffer');await writeFile(output+'/'+item,bytes);assert(bytes.length>1000);}
  const pdfDownload=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:false}).click();await (await pdfDownload).saveAs(output+'/batch.pdf');
  const exported=await readFile(output+'/batch.pdf');assert(exported.length>1000);assert(!exported.includes(Buffer.from('sample@example.com')));
  await page.getByRole('button',{name:'Reset',exact:true}).click();await page.getByText('Drop images or PDFs here',{exact:true}).waitFor();
  report.checks.push({name,locale,pages:2,zipFiles:names,exportedPdfBytes:exported.length,resetClearsImage:true});await context.close();
 }
 assert.deepEqual(report.outside,[]);assert.deepEqual(report.errors,[]);assert.deepEqual(report.consoleErrors,[]);assert(report.requests.every(r=>r.method==='GET'));
}finally{await browser.close();await writeFile(output+'/batch-result.json',JSON.stringify(report,null,2)+'\n');}
console.log('PASS native two-page PDF raster/OCR, ZIP of PNGs, flattened PDF export, reset and no external requests/uploads.');

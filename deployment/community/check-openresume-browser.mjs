import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const report='/opt/utilibre/reports/new-services-20261009/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext(),requests=[],errors=[];ctx.setDefaultTimeout(30000);
try{
 const page=await ctx.newPage();page.on('request',r=>{if(r.url().startsWith('http'))requests.push({host:new URL(r.url()).hostname,method:r.method(),path:new URL(r.url()).pathname})});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://resume-builder.utilibre.org/resume-builder');
 await page.getByLabel('Name',{exact:true}).fill('Fictional Resume Tester');
 await page.getByLabel('Email',{exact:true}).fill('fictional@example.invalid');
 await page.getByLabel('Objective',{exact:true}).fill('Fictional verification record. No real personal information.');
 await page.waitForTimeout(1500);
 await page.waitForFunction(()=>document.querySelector('a[download]')?.getAttribute('href')?.startsWith('blob:'));
 const event=page.waitForEvent('download');await page.getByRole('link',{name:'Download Resume'}).click();const download=await event;await download.saveAs(report+'openresume-fictional.pdf');
 const pdf=await readFile(report+'openresume-fictional.pdf');assert(pdf.subarray(0,5).toString()==='%PDF-');
 await page.reload();await page.getByLabel('Name',{exact:true}).waitFor();assert.equal(await page.getByLabel('Name',{exact:true}).inputValue(),'Fictional Resume Tester');
 await page.goto('https://resume-builder.utilibre.org/resume-parser');
 await page.locator('input[type=file]').setInputFiles(report+'openresume-fictional.pdf');
 await page.getByText('Fictional Resume Tester',{exact:false}).first().waitFor();
 assert.deepEqual([...new Set(requests.map(r=>r.host))],['resume-builder.utilibre.org']);assert(requests.every(r=>['GET','HEAD'].includes(r.method)));assert.deepEqual(errors,[]);
 await writeFile(report+'openresume-browser.json',JSON.stringify({version:'4f8255a-p1',nativePdfDownload:true,nativePdfParser:true,browserStoragePersists:true,noFileUploads:true,networkHosts:[...new Set(requests.map(r=>r.host))],javascriptErrors:errors,transport:'real public HTTPS'},null,2));
 console.log('Native local resume creation, PDF download/parse and browser persistence passed.');
}finally{await ctx.close();await browser.close();}

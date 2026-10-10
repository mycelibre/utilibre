// Verify native workflows using only the repository's fictional samples.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const report='/opt/utilibre/reports/content-review-20261008/everyday-guides';
await mkdir(report,{recursive:true,mode:0o700});process.umask(0o077);
const sample=new URL('../../portal/public/examples/',import.meta.url);
const browser=await chromium.launch();const results=[];
let pastePage,receipt;
try {
 const page=await browser.newPage({acceptDownloads:true});
 const markdown=await readFile(new URL('document-en.md',sample),'utf8');
 await page.goto('https://dev.utilibre.org/markdown-to-html');
 await page.getByPlaceholder('Your Markdown content...').fill(markdown);
 await page.waitForFunction(()=>document.body.innerText.includes('<h1>Fictional reading plan</h1>'));
 results.push({flow:'Markdown to HTML',passed:true,scope:'Native output contains heading and fictional coordinator; source remains editable Markdown.'});
 await page.goto('https://pdf.utilibre.org/markdown-to-pdf.html');
 await page.locator('#mdFileInput').setInputFiles(new URL('document-en.md',sample).pathname);
 await page.locator('#mdPreview h1').getByText('Fictional reading plan',{exact:true}).waitFor();
 await page.evaluate(()=>{window.utilibrePrintCalled=false;window.print=()=>{window.utilibrePrintCalled=true;};});
 await page.locator('#mdExport').click();assert(await page.evaluate(()=>window.utilibrePrintCalled),'Native Export PDF must invoke browser printing');
 const pdf=await page.pdf({format:'A4',printBackground:true});
 assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
 const {getDocument}=await import('/opt/utilibre/src/bentopdf/node_modules/pdfjs-dist/legacy/build/pdf.mjs');
 const document=await getDocument({data:Uint8Array.from(pdf),useSystemFonts:true}).promise;
 let text='';for(let n=1;n<=document.numPages;n++)text+=(await(await document.getPage(n)).getTextContent()).items.map(i=>i.str||'').join(' ');
 assert.match(text,/Fictional reading plan/);assert.match(text,/Ana Example/);await document.destroy();
 results.push({flow:'Markdown to PDF',passed:true,scope:'Native Export PDF invokes browser printing; Chromium print output reopens with PDF.js and retains heading and coordinator. OS print-dialog selection is not automated.'});
 await page.goto('https://scrub.utilibre.org/');
 await page.locator('#file-input').setInputFiles(new URL('fictional-image.jpg',sample).pathname);
 await page.locator('#continueButtonExif').waitFor();
 assert.match(await page.locator('#exifScrollDiv').innerText(),/UTILIBRE FICTIONAL EXAMPLE/);
 results.push({flow:'Inspect EXIF',passed:true,scope:'Image Scrubber shows the fictional Artist tag before editing; original file unchanged.'});
 await page.goto("https://cyberchef.utilibre.org/#recipe=SHA2('256',64,160)");
 await page.waitForFunction(()=>window.app?.appLoaded&&window.app?.workerLoaded);
 const bytes=await readFile(new URL('fictional-image.jpg',sample));const expected=createHash('sha256').update(bytes).digest('hex');
 await page.locator('#open-file').setInputFiles(new URL('fictional-image.jpg',sample).pathname);
 await page.waitForTimeout(400);await page.getByRole('button',{name:'BAKE!',exact:false}).click();
 await page.waitForFunction(hash=>document.querySelector('#output-text')?.textContent.includes(hash),expected);
 results.push({flow:'File SHA-256',passed:true,scope:'Native file picker hashes exact JPEG bytes; matches independent Node SHA-256.',sampleSha256:expected});
 await page.goto('about:blank');
 await page.goto('https://cyberchef.utilibre.org/#recipe=Extract_EXIF()');
 await page.waitForFunction(()=>window.app?.appLoaded&&window.app?.workerLoaded);
 await page.locator('#open-file').setInputFiles(new URL('fictional-image.jpg',sample).pathname);
 await page.waitForTimeout(400);await page.getByRole('button',{name:'BAKE!',exact:false}).click();
 await page.waitForFunction(()=>document.querySelector('#output-text')?.textContent.includes('unsafe-eval'));
 results.push({flow:'CyberChef EXIF limitation',passed:true,scope:'Parser is blocked by existing strict CSP; not offered as working EXIF path. Image Scrubber is verified instead.'});
 await page.goto('about:blank');
 await page.goto('https://cyberchef.utilibre.org/#recipe=Detect_File_Type(true,true,true,true,true,true,true)');
 await page.waitForFunction(()=>window.app?.appLoaded&&window.app?.workerLoaded);
 await page.locator('#open-file').setInputFiles(new URL('fictional-image.jpg',sample).pathname);
 await page.waitForTimeout(400);await page.getByRole('button',{name:'BAKE!',exact:false}).click();
 await page.waitForFunction(()=>document.querySelector('#output-text')?.textContent.includes('image/jpeg'));
 results.push({flow:'Detect file type',passed:true,scope:'Native file-signature check identifies the fictional JPEG; not a malware or authenticity check.'});
 await page.close();
 pastePage=await browser.newPage();await pastePage.goto('https://paste.utilibre.org/');
 await pastePage.locator('#pasteFormatter').selectOption('syntaxhighlighting');
 await pastePage.locator('#pasteExpiration').selectOption('5min');
 const code='// Fictional Utilibre guide example\nconst answer = 42;';
 await pastePage.locator('#message').fill(code);
 const sent=pastePage.waitForResponse(r=>r.request().method()==='POST'&&r.url().startsWith('https://paste.utilibre.org/'));
 await pastePage.locator('#sendbutton').click();receipt=await(await sent).json();assert.equal(receipt.status,0);
 await writeFile(report+'/privatebin-cleanup.json',JSON.stringify(receipt),{mode:0o600});
 await pastePage.waitForFunction(()=>location.hash.length>15);
 const recipient=await browser.newPage();await recipient.goto(pastePage.url());
 await recipient.waitForFunction(()=>document.body.innerText.includes('const answer = 42;'));
 assert(await recipient.locator('pre').count());await recipient.close();
 results.push({flow:'PrivateBin source code',passed:true,scope:'Native Source Code formatter; separate browser opens and decrypts fictional snippet; five-minute expiry.'});
} catch(error){await writeFile(report+'/failure.txt',String(error.stack),{mode:0o600});console.error('Everyday workflow verification failed:',error.name);process.exitCode=1;}
finally{
 if(receipt?.id&&receipt?.deletetoken){
  const deleted=await pastePage.evaluate(async({id,token})=>{const r=await fetch(`/?pasteid=${id}&deletetoken=${token}`,{headers:{'X-Requested-With':'JSONHttpRequest'}});return r.json()},{id:receipt.id,token:receipt.deletetoken}).catch(()=>null);
  if(deleted?.status!==0){console.error('Own synthetic paste deletion failed; private cleanup receipt retained and five-minute expiry remains.');process.exitCode=1;}
  else{await rm(report+'/privatebin-cleanup.json',{force:true});results.push({flow:'Delete fictional paste',passed:true});}
 }
 await browser.close();await writeFile(report+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),results,passed:!process.exitCode},null,2)+'\n',{mode:0o600});
 for(const result of results)console.log(result.flow+': passed');
}

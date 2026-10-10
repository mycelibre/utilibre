// Native BentoPDF booklet verification: fictional PDFs only, no print claims.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {getDocument} from '/opt/utilibre/src/bentopdf/node_modules/pdfjs-dist/legacy/build/pdf.mjs';
const report=process.argv[2]||'/opt/utilibre/reports/booklet-20261008';
process.umask(0o077);await mkdir(report,{recursive:true,mode:0o700});
const input=await readFile(new URL('../../portal/public/examples/booklet-eight-pages.pdf',import.meta.url));
const inputPath=report+'/fictional-eight-pages.pdf';await writeFile(inputPath,input);
const beforeHash=createHash('sha256').update(input).digest('hex');
const browser=await chromium.launch();const cases=[];
async function inspect(bytes){
 const doc=await getDocument({data:Uint8Array.from(bytes),useSystemFonts:true}).promise;const out=[];
 for(let n=1;n<=doc.numPages;n++){
  const p=await doc.getPage(n);const texts=(await p.getTextContent()).items.filter(i=>/^PAGE_\d+$/.test(i.str));
  out.push({width:p.view[2]-p.view[0],height:p.view[3]-p.view[1],rotation:p.rotate,pages:texts.map(t=>({number:Number(t.str.slice(5)),matrix:t.transform.map(x=>Number(x.toFixed(3)))}))});
 }
 await doc.destroy();return out;
}
try{
 for(const config of [
  {id:'en-default',lang:'en',paper:'Letter',grid:'1x2',orientation:'auto',rotation:'none'},
  {id:'es-a4',lang:'es',paper:'A4',grid:'1x2',orientation:'auto',rotation:'none'},
  {id:'en-portrait',lang:'en',paper:'Letter',grid:'1x2',orientation:'portrait',rotation:'none'},
  {id:'en-grid-2x2',lang:'en',paper:'Letter',grid:'2x2',orientation:'auto',rotation:'none'},
  {id:'en-clockwise',lang:'en',paper:'Letter',grid:'1x2',orientation:'auto',rotation:'90cw'},
 ]){
  const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});const requests=[];const outside=[];const errors=[];
  await context.route('**/*',route=>{
   const r=route.request();const u=new URL(r.url());requests.push({origin:u.origin,path:u.pathname,method:r.method(),bodyBytes:r.postDataBuffer()?.length||0});
   if(['http:','https:'].includes(u.protocol)&&u.origin!=='https://pdf.utilibre.org'){outside.push(r.url());return route.abort();}
   return route.continue();
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('https://pdf.utilibre.org/'+(config.lang==='es'?'es/':'')+'pdf-booklet.html');
  await page.locator('#file-input').setInputFiles(inputPath);await page.locator('#tool-options').waitFor({state:'visible'});
  await page.locator('#paper-size').selectOption(config.paper);
  await page.locator('input[name=grid-mode][value="'+config.grid+'"]').check();
  await page.locator('input[name=orientation][value="'+config.orientation+'"]').check();
  await page.locator('input[name=rotation][value="'+config.rotation+'"]').check();
  const labels={heading:await page.locator('h1').innerText(),paperSize:await page.locator('label[for=paper-size]').innerText(),preview:await page.locator('#preview-btn').innerText(),download:await page.locator('#download-btn').innerText(),options:await page.locator('#tool-options').innerText()};
  await page.locator('#preview-btn').click();await page.waitForFunction(()=>!document.querySelector('#download-btn').disabled);
  const canvases=await page.locator('#booklet-preview canvas').count();
  const downloadEvent=page.waitForEvent('download');await page.locator('#download-btn').click();const download=await downloadEvent;
  const filename=download.suggestedFilename();const file=report+'/'+config.id+'.pdf';await download.saveAs(file);
  const output=await inspect(await readFile(file));
  const expected=config.grid==='1x2'?[[8,1],[2,7],[6,3],[4,5]]:[[1,2,3,4],[5,6,7,8]];
  assert.deepEqual(output.map(p=>p.pages.map(i=>i.number)),expected);
  assert.equal(canvases,expected.length);
  for(const p of output){const shouldLandscape=config.grid==='1x2'&&config.orientation!=='portrait';assert.equal(p.width>p.height,shouldLandscape);}
  assert.deepEqual(outside,[]);assert.equal(requests.filter(r=>r.method!=='GET').length,0);assert.equal(requests.filter(r=>r.bodyBytes>0).length,0);assert.deepEqual(errors,[]);
  await page.screenshot({path:report+'/'+config.id+'.png',fullPage:true});
  cases.push({...config,labels,filename,output,previewCanvases:canvases,requests:requests.length,nonGetRequests:0,externalRequests:outside.length,pageErrors:errors});
  await context.close();
 }
 const original=cases.find(c=>c.id==='en-default');const rotated=cases.find(c=>c.id==='en-clockwise');
 const rotationEffective=JSON.stringify(original.output)!==JSON.stringify(rotated.output);
 assert.equal(createHash('sha256').update(await readFile(inputPath)).digest('hex'),beforeHash);
 const result={checkedAt:new Date().toISOString(),sourceUnchanged:true,sourceSha256:beforeHash,cases,rotationEffective,limits:['Digital PDF imposition only; no physical printer, duplex, folding or stitching tested.','No large-document capacity or every paper size tested.']};
 await writeFile(report+'/results.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({cases:cases.length,orderingAndOrientationVerified:true,rotationEffective,externalRequests:0,nonGetRequests:0,report}));
}finally{await browser.close();}

import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.argv[2], ports={vvveb:3238,jscad:3235,glyphr:3233,blockbench:3232,floorplan:3231,fossflow:3237,openreel:3230,grid:3236};
if(!ports[name])throw Error('Unknown reviewed app');
const out='/opt/utilibre/reports/creative-batch-20261011';await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
const base=process.argv[3]||`http://127.0.0.1:${ports[name]}`, requests=[],errors=[];
page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push({url:r.url(),method:r.method()});});
page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('dialog',d=>d.accept());
const report={name,date:new Date().toISOString(),environment:'Linux headless Chromium, synthetic data',origin:base,checks:[]};
async function download(action,file){const promise=page.waitForEvent('download',{timeout:25000});await action();const item=await promise;await item.saveAs(out+'/'+file);return await readFile(out+'/'+file);}
try{
 await page.goto(base,{waitUntil:'networkidle'});
 if(name==='openreel') {
  await page.getByRole('button',{name:'Open editor',exact:true}).click();await page.waitForTimeout(2000);
  await page.getByRole('button',{name:'Skip tour',exact:true}).last().click({timeout:15000});
  await page.locator('input[type=file]').first().setInputFiles('/home/ubuntu/freetools/portal/public/examples/fictional-image.jpg');
  await page.waitForTimeout(1500);
  await page.locator('img[alt="fictional-image.jpg"]').dblclick();
  await page.getByRole('button',{name:'Export',exact:true}).click();
  await page.waitForTimeout(1000);
  const video=await download(()=>page.getByRole('button',{name:'Export Video',exact:true}).click(),'openreel-practice.mp4');
  assert.equal(video.subarray(4,8).toString(),'ftyp');
  const dimensions=await page.evaluate(async bytes=>{const v=document.createElement('video');v.src=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'video/mp4'}));await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=reject;});const value={width:v.videoWidth,height:v.videoHeight,duration:v.duration};URL.revokeObjectURL(v.src);return value;},[...video]);
  assert.ok(dimensions.duration>=4.9);report.video=dimensions;
  report.checks.push('Imported fictional image, added timeline clip, downloaded and reopened a five-second MP4');
 }
 if(name==='grid') {
  await page.goto(base+'/kiri/',{waitUntil:'networkidle'});
  if(await page.locator('#gotit').isVisible())await page.locator('#gotit').click();
  await page.locator('#load-file').setInputFiles('/home/ubuntu/freetools/portal/public/examples/practice-cube.stl');
  await page.waitForTimeout(1500);
  await page.evaluate(()=>{kiri_api.function.export();});
  await page.locator('#print-download').waitFor({state:'visible',timeout:45000});
  const bytes=await download(()=>page.locator('#print-download').click(),'grid-practice.gcode');
  assert.match(bytes.toString(),/G1/);assert.ok(bytes.length>1000);
  report.checks.push('Imported synthetic STL; native slice/preview/export produced G-code; not run on a machine');
 }
 if(name==='vvveb'){
  await page.waitForFunction(()=>window.Vvveb?.Builder?.frameBody);
  const heading=page.frameLocator('#iframe1').locator('h1');
  await heading.dblclick();await heading.fill('Fictional workshop edited');
  await page.locator('#download-btn').focus();
  const bytes=await download(()=>page.locator('#download-btn').click(),'vvveb-workshop.zip');
  assert.equal(bytes.subarray(0,2).toString(),'PK');report.checks.push('Edited native iframe; Download produced ZIP');
 }
 if(name==='jscad'){
  await page.locator('#fileLoader').setInputFiles('/home/ubuntu/freetools/portal/public/examples/jscad');
  await page.waitForTimeout(2500);
  const options=await page.locator('#exportFormats option').evaluateAll(ns=>ns.map(n=>({text:n.textContent,value:n.value})));
  report.exportOptions=options;
  await page.locator('#exportFormats').selectOption(options.find(n=>/STL.*ASCII/i.test(n.text)||/ascii/i.test(n.text)).value);
  const bytes=await download(()=>page.locator('#exportBtn').click(),'jscad-cube.stl');
  assert.match(bytes.toString(),/facet normal/);assert.equal((bytes.toString().match(/endfacet/g)||[]).length,12);report.checks.push('Imported 20×15×10 cube; exported 12-triangle ASCII STL');
 }
 if(name==='glyphr'){
  await page.locator('#input__new-project-name').fill('Fictional Practice');
  await page.getByText('Create a new font from scratch',{exact:true}).click();
  await page.waitForTimeout(800);
  await page.getByRole('button',{name:'File',exact:true}).click();
  const gs=await download(()=>page.getByText('Save project file (to downloads folder)',{exact:true}).click(),'glyphr-practice.gs2');assert.ok(JSON.parse(gs));
  await page.getByRole('button',{name:'File',exact:true}).click();
  const otf=await download(()=>page.getByText('Export OTF file',{exact:true}).last().click(),'glyphr-practice.otf');assert.equal(otf.subarray(0,4).toString(),'OTTO');
  report.checks.push('Created font project; native GS2 and OTF downloads parsed (initial glyph only)');
 }
 if(name==='blockbench'){
  await page.getByText('Generic Model',{exact:true}).click();
  await page.waitForTimeout(500);
  await page.locator('#create_new_model_button').click();
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:'Confirm',exact:true}).click();
  await page.evaluate(()=>{new Cube({name:'Fictional cube',from:[0,0,0],to:[4,4,4]}).init().select();});
  const bb=await download(()=>page.keyboard.press('Control+s'),'blockbench-practice.bbmodel');assert.equal(JSON.parse(bb).elements.length,1);
  report.checks.push('Created generic model and cube through native API; Ctrl+S downloaded one-element BBMODEL');
 }
 if(name==='floorplan'){
  await page.getByRole('button',{name:/Start from Scratch/}).click();
  await page.waitForTimeout(1000);
  await page.keyboard.press('w');await page.mouse.click(650,400);await page.mouse.click(850,400);await page.mouse.dblclick(850,600);await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Export',exact:true}).click();
  const plan=await download(()=>page.getByRole('button',{name:'Download JSON',exact:true}).click(),'floorplan-practice.json');const parsed=JSON.parse(plan);report.projectShape=Object.keys(parsed);
  report.checks.push('Drew walls; native project JSON download parsed');
 }
 if(name==='fossflow'){
  await page.getByRole('button',{name:'Rectangle (R)',exact:true}).click();
  await page.mouse.move(650,350);await page.mouse.down();await page.mouse.move(850,500,{steps:6});await page.mouse.up();
  await page.getByRole('button',{name:'Main menu',exact:true}).click();
  const bytes=await download(()=>page.getByText('Export as JSON',{exact:true}).click(),'fossflow-practice.json');
  const data=JSON.parse(bytes);assert.ok(data);report.checks.push('Drew a rectangle; native JSON export parsed');
 }
 report.body=(await page.locator('body').innerText()).slice(0,12000);
 report.controls=await page.locator('button:visible,input:visible,select:visible,[role=button]:visible').evaluateAll(ns=>ns.map(n=>({tag:n.tagName,text:n.innerText?.slice(0,80),title:n.title,aria:n.getAttribute('aria-label'),id:n.id,type:n.type})));
}catch(e){report.failure=e.message;process.exitCode=1;}
report.external=requests.filter(r=>new URL(r.url).origin!==base);report.nonGet=requests.filter(r=>r.method!=='GET');report.errors=errors;
await writeFile(out+'/'+name+'-task.json',JSON.stringify(report,null,2));
await page.screenshot({path:out+'/'+name+'-task.png'});await browser.close();
console.log(JSON.stringify(report,null,2));

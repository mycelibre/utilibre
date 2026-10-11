import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const name=process.argv[2],dir='/opt/utilibre/reports/creative-batch-20261011',examples='/home/ubuntu/freetools/portal/public/examples/';
if(!['glyphr','fossflow','floorplan','blockbench'].includes(name))throw Error('Unknown example');
const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),origin=`https://${name}.utilibre.org`,external=[],errors=[];
page.setDefaultTimeout(20000);
// Exercise upstream's standard file-input fallback; native OS pickers are not
// automatable in this headless environment. This affects the test context only.
await page.addInitScript(()=>{window.showOpenFilePicker=undefined;});
page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.push(r.url());});
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
const report={name,date:new Date().toISOString(),environment:'Linux desktop Chromium; synthetic native file',checks:[]};
async function choose(action,file){const next=page.waitForEvent('filechooser');await action();await(await next).setFiles(examples+file);await page.waitForTimeout(1000);}
try{
 await page.goto(origin,{waitUntil:'networkidle'});
 if(name==='glyphr'){
  await page.locator('#open-project__tab-load').click();
  await choose(()=>page.getByText('or, open file chooser...',{exact:true}).click(),'glyphr-practice.gs2');
  await page.getByRole('button',{name:'File',exact:true}).waitFor();
  report.checks.push('Loaded the published GS2 example into the native editor');
 }
 if(name==='fossflow'){
  await page.getByRole('button',{name:'Main menu',exact:true}).click();
  await choose(()=>page.getByText('Open',{exact:true}).click(),'fossflow-practice.json');
  await page.getByRole('button',{name:'Main menu',exact:true}).click();
  const downloading=page.waitForEvent('download');await page.getByText('Export as JSON',{exact:true}).click();
  await(await downloading).saveAs(dir+'/fossflow-reimport.json');
  const data=JSON.parse(await readFile(dir+'/fossflow-reimport.json','utf8'));
  report.shape=Object.keys(data);report.checks.push('Imported published example, exported valid native JSON again');
 }
 if(name==='floorplan'){
  await page.getByRole('button',{name:/Start from Scratch/}).click();
  await page.getByRole('button',{name:'Export',exact:true}).click();
  await choose(()=>page.getByRole('button',{name:'Import JSON',exact:true}).click(),'floorplan-practice.json');
  await page.getByRole('button',{name:'3D',exact:true}).click();
  await page.waitForTimeout(2000);
  assert.ok(await page.locator('canvas').count());report.checks.push('Imported published room geometry; 3D canvas rendered');
 }
 if(name==='blockbench'){
  await choose(()=>page.getByText('Open Model',{exact:true}).click(),'blockbench-practice.bbmodel');
  assert.equal(await page.evaluate(()=>Project.elements.length),1);
  report.checks.push('Opened published BBMODEL; restored one editable cube');
 }
}catch(e){report.failure=e.message;process.exitCode=1;}
report.body=(await page.locator('body').innerText()).slice(0,5000);report.external=external;report.errors=errors;
await page.screenshot({path:dir+'/'+name+'-import.png'});await browser.close();
await writeFile(dir+'/'+name+'-import.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));

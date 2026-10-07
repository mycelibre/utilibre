import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const browser=await chromium.launch(), results=[];
const fixture=name=>new URL(`../../portal/public/examples/${name}`,import.meta.url);
async function run(host,fn){if(process.env.APP&&process.env.APP!==host)return;const c=await browser.newContext();await c.addInitScript(()=>{delete window.showOpenFilePicker;delete window.showSaveFilePicker});const p=await c.newPage(), writes=[],external=new Set();p.setDefaultTimeout(15000);p.on('request',r=>{if(!/^https?:/.test(r.url())||r.url().includes('/cdn-cgi/'))return;if(!['GET','HEAD'].includes(r.method()))writes.push(r.method());if(new URL(r.url()).host!==host+'.utilibre.org')external.add(new URL(r.url()).host)});try{await p.goto(`https://${host}.utilibre.org/`);await fn(p);assert.deepEqual(writes,[]);results.push({host,result:'PASS',external:[...external],uploads:0})}catch(e){results.push({host,result:'FAIL',error:e.message});process.exitCode=1}finally{await c.close()}}
async function downloaded(p,fn){const [file]=await Promise.all([p.waitForEvent('download'),fn()]);return readFile(await file.path())}
await run('draw',async p=>{
  for(const lang of ['en','es']){
    if(lang==='es')await p.goto('https://draw.utilibre.org/');
    await p.getByText('File',{exact:true}).click();await p.getByText('Open from',{exact:true}).hover();const fc=p.waitForEvent('filechooser');await p.getByText('Device...',{exact:true}).click();await(await fc).setFiles(fixture(`process-${lang}.drawio`).pathname);
    const label=lang==='en'?'Prepare materials':'Preparar materiales';await p.getByText(label,{exact:true}).dblclick();await p.keyboard.type('Practice / Práctica');await p.keyboard.press('Escape');
    await p.keyboard.press('Control+Shift+S');await p.locator('select').last().selectOption({label:'Download'});const bytes=await downloaded(p,()=>p.getByRole('button',{name:'OK',exact:true}).click());assert(bytes.length>100);
    // Reopen through the same native importer; draw.io may compress its XML.
    await p.getByText('File',{exact:true}).click();await p.getByText('Open from',{exact:true}).hover();const again=p.waitForEvent('filechooser');await p.getByText('Device...',{exact:true}).click();await(await again).setFiles({name:'practice.drawio',mimeType:'application/xml',buffer:bytes});await p.getByText('Practice / Práctica',{exact:true}).waitFor();
  }
});
await run('whiteboard',async p=>{
  for(const lang of ['en','es']){
    await p.getByRole('button',{name:'Rectangle',exact:true}).waitFor();const file=await readFile(fixture(`workshop-${lang}.excalidraw`));const chooser=p.waitForEvent('filechooser');await p.keyboard.press('Control+O');await(await chooser).setFiles({name:'workshop.excalidraw',mimeType:'application/json',buffer:file});
    // Add one editable native rectangle to the imported board.
    await p.getByRole('button',{name:'Rectangle',exact:true}).click();await p.mouse.move(700,450);await p.mouse.down();await p.mouse.move(850,520);await p.mouse.up();
    const bytes=await downloaded(p,()=>p.keyboard.press('Control+Shift+S'));const scene=JSON.parse(bytes);assert.equal(scene.type,'excalidraw');assert.equal(scene.elements.filter(e=>e.type==='text').length,4);assert(scene.elements.some(e=>e.type==='rectangle'));
    const again=p.waitForEvent('filechooser');await p.keyboard.press('Control+O');await(await again).setFiles({name:'saved.excalidraw',mimeType:'application/json',buffer:bytes});const copy=JSON.parse(await downloaded(p,()=>p.keyboard.press('Control+Shift+S')));assert.equal(copy.elements.length,scene.elements.length);
  }
});
await run('charts',async p=>{
  for(const lang of ['en','es']){if(lang==='es')await p.reload();await p.locator('textarea').first().fill(await readFile(fixture(`survey-${lang}.csv`),'utf8'));await p.getByText('Bar chart',{exact:true}).click();for(const field of lang==='en'?['Activity','Responses']:['Actividad','Respuestas'])await p.locator('[draggable=true]').filter({hasText:field}).dragTo(p.getByText('Drop dimension here',{exact:true}).nth(0));const svg=(await downloaded(p,()=>p.getByRole('button',{name:'Download',exact:true}).click())).toString();for(const value of [12,8,6])assert(svg.includes(`>${value}</text>`));for(const label of lang==='en'?['Reading','Practice','Discussion']:['Lectura','Práctica','Debate'])assert(svg.includes(label));assert.match(svg,/<svg/)}
});
await run('pdf',async p=>{
  for(const lang of ['en','es']){await p.goto('https://pdf.utilibre.org/rotate-pdf.html');await p.locator('input[type=file]').setInputFiles(fixture(`scan-${lang}.pdf`).pathname);await p.getByRole('button',{name:'Right',exact:true}).click();const bytes=await downloaded(p,()=>p.getByRole('button',{name:'Apply Rotations',exact:true}).click());assert.equal(bytes.subarray(0,4).toString(),'%PDF');await p.reload();await p.locator('input[type=file]').setInputFiles({name:'rotated.pdf',mimeType:'application/pdf',buffer:bytes});await p.getByText('rotated.pdf',{exact:true}).waitFor();await p.getByRole('button',{name:'Apply Rotations',exact:true}).waitFor();}
});
await browser.close();console.log(JSON.stringify({at:new Date().toISOString(),environment:'Chromium desktop public HTTPS; synthetic samples only',results},null,2));

// Check the installed browser export component using fictional post-decryption data.
// No app account, production record, cryptographic key or SMTP connection is used.
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile,rm,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
process.umask(0o077);
const ram=await mkdtemp('/dev/shm/forms-renderer-'), report=await mkdtemp('/opt/utilibre/reports/forms-renderer-');
const image='utilibre-liberaforms:4.11.1-p5', container='utilibre-forms-renderer-'+process.pid;
const docker=(...a)=>execFileSync('docker',a,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
let browser,page;
const base='http://127.0.0.1:3435';
const structure=[{type:'text',name:'fictional-name',label:'Name',subtype:'text'},{type:'textarea',name:'fictional-note',label:'Note',subtype:'textarea'}];
const items=[{id:1,created:'2026-10-09T12:00:00+00:00',marked:true,data:{'fictional-name':'Fictional Alpha','fictional-note':'Blue lantern, paper boats'}},{id:2,created:'2026-10-09T12:01:00+00:00',marked:false,data:{'fictional-name':'Fictional Beta','fictional-note':'A "quoted" note\nSecond line'}}];
const index=[{name:'marked',label:'Marked'},{name:'fictional-name',label:'Name'},{name:'fictional-note',label:'Note'},{name:'created',label:'Created'}];
const payload={items,meta:{name:'fictional-export',data_type:'answer',deleted_fields:[],default_field_index:index,form_structure:structure,item_endpoint:'/data-display/answer/',can_edit:true,show_modes:true,enabled_exports:['csv','json','pdf'],title:'Fictional export',map:{markers:{}},timezone:'UTC',page_length:50,total_items_on_server:2},user_prefs:{field_index:index,order_by:'created',ascending:true,pdf:null,show_chrono_graph:false,extended_filters:{},map:{}}};
const source='/static/js/data-display/v5.6.0';
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/static/vendor/bootstrap-5.3.7/dist/css/bootstrap.min.css"></head><body><div vue-component="data-display" data-endpoint="/data-display/form/1" data-ui_language="en" data-display_as="table" data-csrf_token="fictional"></div><div vue-component="items-renderer"></div><div vue-component="graph-renderer"></div><div vue-component="pdf-builder"></div>${['data-display','items-renderer','graph-renderer','pdf-builder'].map(x=>`<script src="${source}/${x}.js"></script>`).join('')}</body></html>`;
try{
 const id=docker('image','inspect',image,'--format','{{.Id}}').trim();
 assert.equal(id,'sha256:1796ba695c368e3c439338d551fce576cb0afd9fc58de961dbcb233a4eb8766e');
 docker('create','--network','none','--name',container,image);
 docker('cp',container+':/app/liberaforms/static',ram+'/static');
 docker('rm',container);
 browser=await chromium.launch();const context=await browser.newContext({acceptDownloads:true});const outside=[];
 await context.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin!==base){outside.push(u.origin);return r.abort();}if(['/pdfjs/pdf.mjs','/pdfjs/pdf.worker.mjs'].includes(u.pathname))return r.fulfill({contentType:'text/javascript',body:await readFile('/opt/utilibre/pack-static/bentopdf-2.8.8-p3/pdfjs-viewer/'+u.pathname.split('/').pop())});if(u.pathname==='/')return r.fulfill({contentType:'text/html',body:html});if(u.pathname.startsWith('/data-display/'))return r.fulfill({json:payload});if(u.pathname.startsWith('/static/')){try{return r.fulfill({body:await readFile(ram+u.pathname),contentType:u.pathname.endsWith('.js')?'text/javascript':u.pathname.endsWith('.css')?'text/css':'application/octet-stream'});}catch{return r.fulfill({status:404});}}return r.fulfill({status:404});});
 page=await context.newPage();page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');await page.getByText('Total answers: 2',{exact:true}).waitFor();await page.waitForTimeout(500);
 for (const type of ['CSV','JSON']) {
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:type,exact:true}).click()]);
 await download.saveAs(report+'/answers.'+type.toLowerCase());const contents=await readFile(report+'/answers.'+type.toLowerCase(),'utf8');
 assert(contents.includes('Fictional Alpha')&&contents.includes('Fictional Beta'));}
 const json=JSON.parse(await readFile(report+'/answers.json','utf8'));
 assert.deepEqual(json.answers,items.map(i=>({marked:i.marked,...i.data,created:i.created})));
 assert.deepEqual(json.labels,Object.fromEntries(index.map(i=>[i.name,i.label])));
 const csv=JSON.parse(execFileSync('python3',['-c','import csv,json,sys; print(json.dumps(list(csv.DictReader(sys.stdin))))'],{input:await readFile(report+'/answers.csv','utf8'),encoding:'utf8'}));
 assert.equal(csv.length,2);assert.equal(csv[0].Name,'Fictional Alpha');assert.equal(csv[0].Note,items[0].data['fictional-note']);assert.equal(csv[1].Note,items[1].data['fictional-note']);assert.equal(csv[0].Created,'2026-10-09 12:00:00');assert.equal(csv[0].Marked,'True');assert.equal(csv[1].Marked,'False');
 await page.getByRole('button',{name:'PDF',exact:true}).click();
 const [pdf]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Download PDF',exact:true}).click()]);await pdf.saveAs(report+'/answers.pdf');
 const pdfText=await page.evaluate(async bytes=>{const pdfjs=await import('/pdfjs/pdf.mjs');pdfjs.GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.mjs';const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;let text='';for(let n=1;n<=doc.numPages;n++){text+=(await (await doc.getPage(n)).getTextContent()).items.map(i=>i.str).join(' ')+'\n';}await doc.destroy();return text;},Array.from(await readFile(report+'/answers.pdf')));assert(pdfText.includes('Fictional Alpha')&&pdfText.includes('Fictional Beta'));await writeFile(report+'/pdf-text.txt',pdfText);
 await writeFile(report+'/body.txt',await page.locator('body').innerText());await writeFile(report+'/errors.json',JSON.stringify(errors));await writeFile(report+'/elements.json',JSON.stringify(await page.locator('button,a').evaluateAll(es=>es.map(e=>({tag:e.tagName,text:e.textContent.trim(),title:e.title,aria:e.getAttribute('aria-label')}))),null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
 await writeFile(report+'/result.json',JSON.stringify({checkedAt:new Date().toISOString(),image:id,scope:'Installed native export renderer with fictional post-decryption table data; not an authentication or E2EE test.',errors,outside,result:'passed',csvJsonPdfContent:true}));
}catch(e){await writeFile(report+'/failure.txt',String(e.stack));if(page)await writeFile(report+'/body.txt',await page.locator('body').innerText());process.exitCode=1;}finally{await browser?.close();try{docker('rm','-f',container);}catch{}await rm(ram,{recursive:true,force:true});console.log(report);}

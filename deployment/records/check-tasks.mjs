import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {request,chromium} from '../../portal/node_modules/playwright/index.mjs';
const dir='/opt/utilibre/reports/records-20261011';await mkdir(dir,{recursive:true});
const results=[];
const a=await request.newContext({storageState:'/opt/utilibre/records/private/browser-state-0.json'});
const b=await request.newContext({storageState:'/opt/utilibre/records/private/browser-state-1.json'});
const ba=await request.newContext({storageState:'/opt/utilibre/records/private/bookplate-state-0.json'});
const bb=await request.newContext({storageState:'/opt/utilibre/records/private/bookplate-state-1.json'});
const guest=await request.newContext();
const browser=await chromium.launch({args:['--no-sandbox']});
const contexts=[];
async function json(res,label){assert(res.ok(),label+': HTTP '+res.status()+' '+(await res.text()).slice(0,180));return res.json();}
try {
 // Native Grist REST operations, including sandboxed Python execution.
 const grist='https://grist.utilibre.org';
 const orgs=await json(await a.get(grist+'/api/orgs'),'Grist orgs');
 const workspaces=await json(await a.get(grist+`/api/orgs/${orgs[0].id}/workspaces`),'Grist workspaces');
 const doc=await json(await a.post(grist+`/api/workspaces/${workspaces[0].id}/docs`,{data:{name:'Synthetic Utilibre check'}}),'Grist create');
 await json(await a.post(grist+`/api/docs/${doc}/tables`,{data:{tables:[{id:'Practice',columns:[{id:'Quantity',fields:{type:'Numeric'}},{id:'Total',fields:{type:'Numeric',isFormula:true,formula:'$Quantity * 3'}}]}]}}),'Grist table');
 await json(await a.post(grist+`/api/docs/${doc}/tables/Practice/records`,{data:{records:[{fields:{Quantity:7}}]}}),'Grist record');
 const rows=await json(await a.get(grist+`/api/docs/${doc}/tables/Practice/records`),'Grist formula');
 assert.equal(rows.records[0].fields.Total,21,'sandboxed formula result');
 assert.equal((await b.get(grist+`/api/docs/${doc}/tables/Practice/records`)).status(),403,'unshared document denied to B');
 const native=await a.get(grist+`/api/docs/${doc}/download`);assert(native.ok());
 const bytes=await native.body();assert.equal(bytes.subarray(0,15).toString(),'SQLite format 3');await writeFile(dir+'/synthetic.grist',bytes);
 const c=await browser.newContext({storageState:'/opt/utilibre/records/private/browser-state-0.json'});contexts.push(c);
 const p=await c.newPage();await p.goto(grist+'/'+doc,{waitUntil:'networkidle'});await p.screenshot({path:dir+'/grist-task.png',fullPage:true});
 results.push('Grist: private document, table, numeric data, sandboxed Python formula, denied second account, native SQLite download');
 // Native Candlr private contacts, recurrence, export and account isolation.
 const candlr='https://candlr.utilibre.org';
 const types=await json(await a.get(candlr+'/api/event-types'),'Candlr types');
 const person=await json(await a.post(candlr+'/api/people',{data:{name:'Fictional Sol Example',event:{event_type_id:types[0].id,month:11,day:14,year:2000,year_known:true,notify:false,notes:'Synthetic example only'}}}),'Candlr create');
 assert.equal((await b.get(candlr+'/api/people/'+person.id)).status(),404);
 const exportResponse=await a.get(candlr+'/api/data/export?format=json');assert(exportResponse.ok());
 const exported=await exportResponse.text();assert(exported.includes('Fictional Sol Example'));await writeFile(dir+'/candlr-example.json',exported);
 const cc=await browser.newContext({storageState:'/opt/utilibre/records/private/browser-state-0.json'});contexts.push(cc);
 const cp=await cc.newPage();await cp.goto(candlr,{waitUntil:'networkidle'});await cp.getByText('Fictional Sol Example').first().waitFor();await cp.screenshot({path:dir+'/candlr-task.png',fullPage:true});
 results.push('Candlr: synthetic recurring date, private contact, denied second account, JSON export, visible saved card');
 // Native Bookplate stores per-user book IDs, so B cannot overwrite A's same ID.
 const bookplate='https://bookplate.utilibre.org';const id='synthetic-'+randomUUID();
 const book={id,title:'Fictional Field Notes',author:'Example Author',status:'reading',rating:0,colorIndex:0,pages:120,genre:'Fiction',addedAt:new Date().toISOString()};
 await json(await ba.put(bookplate+'/api/books/'+id,{data:book}),'Bookplate save');
 assert((await json(await ba.get(bookplate+'/api/books'),'A books')).books.some(x=>x.id===id));
 assert(!(await json(await bb.get(bookplate+'/api/books'),'B books')).books.some(x=>x.id===id));
 assert.equal((await guest.get(bookplate+'/api/books')).status(),401);
 const exportedBooks=await ba.get(bookplate+'/api/export');assert(exportedBooks.ok());
 const zip=await exportedBooks.body();assert.equal(zip.subarray(0,2).toString(),'PK');await writeFile(dir+'/bookplate-example.zip',zip);
 const bc=await browser.newContext({storageState:'/opt/utilibre/records/private/bookplate-state-0.json'});contexts.push(bc);
 const bp=await bc.newPage();await bp.goto(bookplate,{waitUntil:'networkidle'});await bp.getByText(book.title).first().waitFor();await bp.screenshot({path:dir+'/bookplate-task.png',fullPage:true});
 results.push('Bookplate: native saved book, account separation, logged-out API denied, ZIP export, visible saved library');
 await writeFile('/opt/utilibre/records/private/check-records.json',JSON.stringify({gristDoc:doc,candlrPerson:person.id,bookplateBook:id}),{mode:0o600});
} finally {
 for(const c of contexts)await c.close();await browser.close();
 for(const c of [a,b,ba,bb,guest])await c.dispose();
 const report={date:new Date().toISOString(),environment:'Public HTTPS; synthetic accounts; headless Chromium and native APIs',results};
 await writeFile(dir+'/tasks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}

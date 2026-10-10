// Native UI verification with fictional schema; blocks every external HTTP origin.
import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const base=process.argv[2]||'http://127.0.0.1:3192/';
const report=process.argv[3]||'/opt/utilibre/reports/drawdb-20261009';
await mkdir(report,{recursive:true,mode:0o700});
const sql='CREATE TABLE authors (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL); CREATE TABLE books (id INTEGER PRIMARY KEY, author_id INTEGER NOT NULL, title VARCHAR(200), FOREIGN KEY(author_id) REFERENCES authors(id));';
const browser=await chromium.launch();const requests=[],outside=[],errors=[];
async function setup(lang='en'){
 const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
 await context.addInitScript(language=>{localStorage.setItem('drawdb.language',language);localStorage.setItem('bookmarkedTools','["fictional-sentinel"]');localStorage.setItem('settings','fictional-other-app-sentinel')},lang);
 await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());requests.push({path:u.pathname,origin:u.origin,method:r.method()});if(/^https?:$/.test(u.protocol)&&u.origin!==new URL(base).origin){outside.push(r.url());return route.abort()}return route.continue()});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);return {page,context};
}
try{
 const {page:p,context}=await setup();await p.getByText('PostgreSQL',{exact:true}).click();await p.getByText('Confirm',{exact:true}).click();
 await p.getByText('File',{exact:true}).click();await p.getByText('Import from SQL',{exact:true}).click();await p.getByText('Upload file',{exact:true}).click();await p.locator('input[type=file]').first().setInputFiles({name:'fictional.sql',mimeType:'text/plain',buffer:Buffer.from(sql)});await p.getByText('Import',{exact:true}).click();await p.getByText('Tables (2)',{exact:true}).waitFor();await p.getByText('Relationships (1)',{exact:true}).waitFor();
 await p.getByText('File',{exact:true}).click();await p.getByText('Export SQL',{exact:true}).click();await p.locator('.monaco-editor').waitFor();
 let download=p.waitForEvent('download');await p.getByText('Export',{exact:true}).last().click();await (await download).saveAs(report+'/roundtrip.sql');await p.keyboard.press('Escape');
 const exportedSql=await readFile(report+'/roundtrip.sql','utf8');assert.match(exportedSql,/CREATE TABLE IF NOT EXISTS "authors"/);assert.match(exportedSql,/FOREIGN KEY\("author_id"\) REFERENCES "authors"\("id"\)/);
 await p.getByText('File',{exact:true}).click();await p.getByText('Export as',{exact:true}).hover();await p.getByText('JSON',{exact:true}).click();download=p.waitForEvent('download');await p.getByText('Export',{exact:true}).last().click();await (await download).saveAs(report+'/roundtrip.json');await p.keyboard.press('Escape');
 const exported=JSON.parse(await readFile(report+'/roundtrip.json','utf8'));assert.equal(exported.tables.length,2);assert.equal(exported.relationships.length,1);
 await p.getByText('Share',{exact:true}).click();await p.getByText(/Online sharing is unavailable here/).waitFor();await p.keyboard.press('Escape');
 const storage=await p.evaluate(()=>({sentinel:localStorage.getItem('settings'),bookmarks:localStorage.getItem('bookmarkedTools'),keys:Object.keys(localStorage)}));assert.equal(storage.sentinel,'fictional-other-app-sentinel');assert.equal(storage.bookmarks,'["fictional-sentinel"]');
 const url=p.url();await p.reload();await p.getByText('Tables (2)',{exact:true}).waitFor();
 await p.screenshot({path:report+'/english.png'});await context.close();
 const second=await setup();const q=second.page;await q.getByText('PostgreSQL',{exact:true}).click();await q.getByText('Confirm',{exact:true}).click();await q.getByText('File',{exact:true}).click();await q.getByText('Import from',{exact:true}).hover();await q.getByText('JSON',{exact:true}).click();await q.locator('input[type=file]').first().setInputFiles(report+'/roundtrip.json');await q.getByText('Import',{exact:true}).click();await q.getByText('Tables (2)',{exact:true}).waitFor();await q.getByText('Relationships (1)',{exact:true}).waitFor();await second.context.close();
 const spanish=await setup('es');await spanish.page.getByText('Archivo',{exact:true}).waitFor();await spanish.page.screenshot({path:report+'/spanish.png'});const spanishText=await spanish.page.locator('body').innerText();await spanish.context.close();
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);assert(requests.every(r=>r.method==='GET'));await writeFile(report+'/result.json',JSON.stringify({date:new Date().toISOString(),base,nativeSqlImport:true,nativeSqlExport:true,jsonRoundtrip:true,reloadPersistence:true,sharingDisabled:true,storage,spanishText,requests,outside,errors},null,2));console.log('PASS drawDB SQL import/export, JSON fresh-context roundtrip, persistence, isolated keys, Spanish, no external requests or POSTs');
}finally{await browser.close()}

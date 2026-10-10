import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const users=JSON.parse(await readFile('/opt/utilibre/beaverhabits/private/qa.json','utf8'));
const out='/opt/utilibre/reports/beaver-20261009',base='http://127.0.0.1:3216';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[],pages=[],hosts=new Set(),errors=[];
try{
 for (const u of users){const c=await browser.newContext();c.setDefaultTimeout(20000);contexts.push(c);const p=await c.newPage();pages.push(p);p.on('request',r=>hosts.add(new URL(r.url()).hostname));p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/login');await p.getByLabel('Email',{exact:true}).fill(u.email);await p.getByLabel('Password',{exact:true}).fill(u.password);await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForURL(base+'/gui');await p.waitForTimeout(500);
 }
 await pages[0].goto(base+'/gui/export');const downloadPromise=pages[0].waitForEvent('download');await pages[0].getByRole('button',{name:'Export JSON',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/gui-export.json');
 const payload=JSON.parse(await readFile(out+'/gui-export.json','utf8'));assert(payload.habits.some(h=>h.name==='Fictional read one page'));
 await pages[1].goto(base+'/gui/import');await pages[1].locator('input[type=file]').setInputFiles(out+'/gui-export.json');await pages[1].getByRole('button').filter({hasText:'cloud_upload'}).click();await pages[1].getByRole('button',{name:'Yes',exact:true}).click();await pages[1].getByText(/Imported 1 habits/).waitFor();
 const r=await contexts[1].request.get(base+'/api/v1/habits/export',{headers:{Authorization:'Bearer '+users[1].token}});assert(r.ok());const imported=await r.json();const h=imported.habits.find(h=>h.name==='Fictional read one page (imported)');assert(h&&h.records.some(r=>r.done));
 await writeFile(out+'/browser.json',JSON.stringify({nativePasswordLogin:true,twoUsers:true,guiJsonDownload:true,guiJsonImportToSecondAccount:true,completionPreserved:true,hosts:[...hosts],errors,transport:'private HTTP gateway; public HTTPS pending'},null,2));
 for(let i=0;i<2;i++)await writeFile(out+'/browser-state-'+i+'.json',JSON.stringify(await contexts[i].storageState()),{mode:0o600});
 assert.deepEqual([...hosts].filter(x=>x!=='127.0.0.1'),[]);console.log('Native two-account login, JSON download and UI import passed.');
}catch(e){if(pages[1])await pages[1].screenshot({path:out+'/browser-failure.png',fullPage:true});throw e;}
finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}

import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const users=JSON.parse(await readFile('/opt/utilibre/beaverhabits/private/public-qa.json','utf8'));
const out='/opt/utilibre/reports/beaver-public-20261009',base='https://habits.utilibre.org';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const contexts=[],pages=[],hosts=new Set(),errors=[];
try{
 for (const [index,u] of users.entries()){const c=await browser.newContext({viewport:index===0?{width:1440,height:1000}:{width:390,height:844},isMobile:index===1});c.setDefaultTimeout(20000);contexts.push(c);const p=await c.newPage();pages.push(p);p.on('request',r=>hosts.add(new URL(r.url()).hostname));p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto(base+'/login');await p.getByLabel('Email',{exact:true}).fill(u.email);await p.getByLabel('Password',{exact:true}).fill(u.password);await p.getByRole('button',{name:'Continue',exact:true}).click();await p.waitForURL(base+'/gui');await p.waitForTimeout(1000);await p.screenshot({path:out+'/public-layout-'+index+'.png',fullPage:true});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));const session=(await c.cookies()).find(c=>c.name==='session');assert(session?.secure&&session.httpOnly);
 }
 await pages[0].goto(base+'/gui/add');await pages[0].getByLabel('New item',{exact:true}).fill('Fictional public UI habit');await pages[0].getByLabel('New item',{exact:true}).press('Enter');await pages[0].locator('input[aria-label="Habit name"]').filter({visible:true}).last().waitFor();await pages[0].waitForTimeout(400);
 await pages[0].goto(base+'/gui/export');const downloadPromise=pages[0].waitForEvent('download');await pages[0].getByRole('button',{name:'Export JSON',exact:true}).click();const download=await downloadPromise;await download.saveAs(out+'/gui-export.json');
 const payload=JSON.parse(await readFile(out+'/gui-export.json','utf8'));assert(payload.habits.some(h=>h.name==='Fictional public read one page'));
 await pages[1].goto(base+'/gui/import');await pages[1].locator('input[type=file]').setInputFiles(out+'/gui-export.json');await pages[1].getByRole('button').filter({hasText:'cloud_upload'}).click();await pages[1].getByRole('button',{name:'Yes',exact:true}).click();await pages[1].getByText(/Imported 2 habits/).waitFor();
 const r=await contexts[1].request.get(base+'/api/v1/habits/export',{headers:{Authorization:'Bearer '+users[1].token}});assert(r.ok());const imported=await r.json();const h=imported.habits.find(h=>h.name==='Fictional public read one page (imported)');assert(h&&h.records.some(r=>r.done));
 await writeFile(out+'/browser.json',JSON.stringify({nativePasswordLogin:true,twoUsers:true,guiJsonDownload:true,guiJsonImportToSecondAccount:true,completionPreserved:true,hosts:[...hosts],errors,transport:'actual public HTTPS',secureSessionCookie:true,desktopMobileRender:true,nativeUiHabitCreated:true},null,2));
 for(let i=0;i<2;i++)await writeFile(out+'/browser-state-'+i+'.json',JSON.stringify(await contexts[i].storageState()),{mode:0o600});
 assert.deepEqual([...hosts].filter(x=>x!=='habits.utilibre.org'),[]);assert.deepEqual(errors,[]);console.log('Native two-account login, JSON download and UI import passed.');
}catch(e){if(pages[1])await pages[1].screenshot({path:out+'/browser-failure.png',fullPage:true});throw e;}
finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}

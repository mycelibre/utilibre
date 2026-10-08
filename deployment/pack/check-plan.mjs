// Bounded synthetic native-app check. Never reads an existing user's profile.
import {createRequire} from 'node:module';
import {readFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../portal/package.json',import.meta.url));
const {chromium}=require('@playwright/test');
const origin='https://plan.utilibre.org';
const tasks=['Fictional: read a chapter','Fictional: practise a map','Fictional: export backup'];
const browser=await chromium.launch();
try {
 const c=await browser.newContext({acceptDownloads:true});const outside=[];
 c.on('request',r=>{const u=new URL(r.url());if(!['blob:','data:'].includes(u.protocol)&&u.origin!==origin)outside.push(u.origin)});
 const p=await c.newPage();p.setDefaultTimeout(15000);
 await p.goto(origin);await p.getByText('Productivity Suite',{exact:true}).click();
 await p.getByRole('button',{name:'Add more',exact:true}).click();
 const input=p.locator('textarea[aria-label^="A task title"]');
 for(const [i,t] of tasks.entries()){await input.fill(`${t} t${[25,15,5][i]}m`);await input.press('Enter')}
 await p.keyboard.press('Escape');await p.getByText(tasks[0],{exact:true}).waitFor();
 await p.reload();for(const t of tasks)await p.getByText(t,{exact:true}).waitFor();
 await p.getByRole('button',{name:'Enter focus mode',exact:true}).click();
 await p.getByRole('button',{name:/Select task to focus/}).click();
 await p.getByRole('option').filter({hasText:tasks[0]}).click();
 await p.getByRole('button',{name:'Start focus session',exact:true}).click();
 await p.waitForTimeout(2100);assert.match(await p.locator('body').innerText(),/24:5[0-9]/);
 await p.getByRole('button',{name:'Pause session',exact:true}).click();
 await p.getByRole('button',{name:'Close',exact:true}).click();
 const backupPage=async page=>{
   await page.goto(`${origin}/#/config`);
   await page.getByText('Sync & Backup',{exact:true}).first().click();
   await page.getByText('Import/Export',{exact:true}).first().click();
 };
 await backupPage(p);const pending=p.waitForEvent('download');
 await p.getByRole('button',{name:'Export Data',exact:true}).click();const d=await pending;
 await mkdir('/opt/utilibre/pack-test',{recursive:true,mode:0o700});
 const file='/opt/utilibre/pack-test/plan-three-export.json';await d.saveAs(file);
 const json=await readFile(file,'utf8');JSON.parse(json);for(const t of tasks)assert(json.includes(t));
 console.log('Three native tasks/reload, focus countdown/pause and JSON export passed.');
 const empty=await browser.newContext();empty.on('request',r=>{const u=new URL(r.url());if(!['blob:','data:'].includes(u.protocol)&&u.origin!==origin)outside.push(u.origin)});
 const q=await empty.newPage();q.setDefaultTimeout(15000);await q.goto(origin);
 await q.getByText('Productivity Suite',{exact:true}).click();await backupPage(q);
 await q.locator('input[type=file]').setInputFiles(file);
 await q.waitForTimeout(1000);
 await q.goto(`${origin}/#/tag/TODAY/tasks`);for(const t of tasks)await q.getByText(t,{exact:true}).waitFor();
 await q.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:45000});
 await q.waitForTimeout(8000);
 console.log('Native worker state:',await q.evaluate(async()=> (await (await fetch('/ngsw/state')).text()).slice(0,2500)));
 await empty.setOffline(true);await q.reload();for(const t of tasks)await q.getByText(t,{exact:true}).waitFor();
 assert.deepEqual(outside,[]);
 console.log('Native import restored all three tasks; offline reload retained them. External origins: 0. Chromium simulation, not real mobile hardware.');
} finally {await browser.close()}

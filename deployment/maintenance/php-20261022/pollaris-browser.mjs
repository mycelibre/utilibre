import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
assert.equal(process.env.UTILIBRE_ISOLATED_POLLARIS,'1','Run through check-pollaris.mjs in its isolated fixture namespace');
const origin='http://127.0.0.1:8080',browser=await chromium.launch();
const outside=new Set(),errors=[];let voterPage;
async function context(){const c=await browser.newContext({locale:'en-GB'});c.on('request',r=>{const u=new URL(r.url());if(u.protocol.startsWith('http')&&u.origin!==origin)outside.add(u.origin);});return c;}
try{
 const owner=await context(),p=await owner.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/polls/new?type=classic');
 await p.locator('[name="poll[title]"]').fill('Fictional PHP update workshop');await p.locator('[name="poll[authorName]"]').fill('Fictional organizer');
 await p.locator('button[type=submit]').click();await p.waitForURL(/\/proposals/);const management=p.url().split('/proposals')[0];
 const choices=p.locator('input[name^="poll_proposals[proposals]"]');await choices.nth(0).fill('Morning');await choices.nth(1).fill('Afternoon');
 await p.locator('button[value=next]').click();await p.waitForURL(/\/summary/);await p.locator('button[value=next]').click();await p.waitForURL(/\/complete/);
 const link=await p.locator('#poll-public-link').inputValue();assert.equal(new URL(link).origin,origin);
 const guest=await context(),v=await guest.newPage();voterPage=v;await v.goto(link);await v.locator('[name="vote[authorName]"]').fill('Fictional guest');
 const names=await v.locator('[name^="vote[answers]"]').evaluateAll(es=>[...new Set(es.map(e=>e.name))]);assert(names.length>0);
 for(const name of names){const input=v.locator(`input[name="${name}"][value="yes"]`),id=await input.getAttribute('id');await v.locator(`label[for="${id}"]`).click();assert(await input.isChecked());}
 await v.locator('[name="vote[submit]"]').click();await v.getByText('Fictional guest',{exact:true}).first().waitFor({state:'attached'});
 const csv=await v.evaluate(async u=>{const r=await fetch(u+'.csv');return {status:r.status,text:await r.text()};},link);assert.equal(csv.status,200);assert.match(csv.text,/Fictional guest/);
 assert.equal((await v.goto(management.replace(/\/[^/]+$/,'/invalid-token')+'/admin')).status(),404);
 await p.goto(management+'/admin');await p.locator('[data-modal-opener-selector-value$="/deletion"]').click();
 await p.locator('[name="poll_deletion[submit]"]').waitFor();assert((await p.locator('body').innerText()).includes('Fictional PHP update workshop'));
 await p.locator('[name="poll_deletion[submit]"]').click();await p.waitForLoadState('domcontentloaded');
 assert.equal((await v.goto(link)).status(),404);assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,twoSessions:true,pollDeleted:true,externalBrowserRequests:0}));
}catch(error){
 if(voterPage){
  await voterPage.screenshot({path:'/var/lib/utilibre-maintenance/php-20261022/pollaris/browser-failure.png'});
  fs.writeFileSync('/var/lib/utilibre-maintenance/php-20261022/pollaris/browser-failure.json',JSON.stringify(await voterPage.evaluate(()=>({text:document.body.innerText,controls:[...document.querySelectorAll('input[name^="vote[answers]"]')].map(e=>e.parentElement.outerHTML)})),null,2));
 }
 throw error;
}finally{await browser.close();}

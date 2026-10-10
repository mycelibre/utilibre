import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const root='/opt/utilibre/reports/new-services-20261009/';const fixture=JSON.parse(await readFile(root+'gathio-fixture.json','utf8'));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const ctx=await browser.newContext();const page=await ctx.newPage();const hosts=[],errors=[];
page.on('request',r=>{if(r.url().startsWith('http'))hosts.push(new URL(r.url()).hostname)});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('https://events.utilibre.org/');await page.getByRole('link',{name:/More tools/}).waitFor();
 await page.goto('https://events.utilibre.org/'+fixture.eventID);await page.getByText('Fictional revised deployment event',{exact:true}).first().waitFor();
 await page.goto('https://events.utilibre.org/'+fixture.eventID+'?e='+fixture.editToken);assert((await page.locator('body').innerText()).includes('Fictional revised deployment event'));
 await page.goto('https://events.utilibre.org/data-notes');await page.getByText(/Guardá el enlace/).waitFor();
 assert.deepEqual([...new Set(hosts)],['events.utilibre.org']);assert.deepEqual(errors,[]);
 await writeFile(root+'gathio-browser.json',JSON.stringify({realPublicHttps:true,eventAndEditPage:true,bilingualDataNotes:true,portalLink:true,externalBrowserHosts:[],javascriptErrors:errors},null,2));console.log('Public Gathio event/edit/data-note pages passed with local assets only.');
}finally{await ctx.close();await browser.close();}

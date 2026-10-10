// Disposable calendar account only. Credentials are read locally, never logged.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const report='/opt/utilibre/reports/new-services-20261009';
const fixtures=JSON.parse(await readFile(report+'/calendar-fixtures.json','utf8'));
const browser=await chromium.launch();
const context=await browser.newContext({acceptDownloads:true});
const outside=[],errors=[],responses=[];
await context.route('**/*',route=>{const u=new URL(route.request().url());if(/^https?:$/.test(u.protocol)&&u.origin!=='https://calendar.utilibre.org'){outside.push(u.origin+u.pathname);return route.abort()}return route.continue()});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));page.on('response',r=>{const u=new URL(r.url());if(u.pathname.startsWith('/dav')||u.pathname.startsWith('/.well-known'))responses.push({path:u.pathname,method:r.request().method(),status:r.status()})});
try {
 await page.goto('https://calendar.utilibre.org');
 await page.getByRole('button',{name:'Connect CalDAV account'}).click();
 await page.locator('#serverUrl').fill('https://calendar.utilibre.org/dav/');
 await page.locator('#username').fill('utilibre-fixture-a');
 await page.locator('#password').fill(fixtures['utilibre-fixture-a']);
 await page.getByRole('button',{name:'Connect',exact:true}).click();
 await page.locator('#password').waitFor({state:'hidden'});
 await page.getByText(/Fictional (edited )?workshop/).first().waitFor();
 console.log('Public CalDAV connection and event display passed');
 await page.getByRole('button',{name:'Contacts',exact:true}).click();
 await page.getByText('Fictional Example',{exact:true}).first().waitFor({timeout:20000});
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 await page.getByRole('button',{name:'Data',exact:true}).click();
 await page.locator('[data-action=export-ics]').waitFor();
 console.log('Native Data settings opened');
 const download=page.waitForEvent('download',{timeout:10000});
 await page.locator('[data-action=export-ics]').click();
 await(await download).saveAs(report+'/calino-browser-export.ics');
 assert.match(await readFile(report+'/calino-browser-export.ics','utf8'),/Fictional/);
 const contactDownload=page.waitForEvent('download',{timeout:10000});await page.getByRole('button',{name:'Export .vcf',exact:true}).click();await(await contactDownload).saveAs(report+'/calino-browser-export.vcf');assert.match(await readFile(report+'/calino-browser-export.vcf','utf8'),/Fictional Example/);
 await page.screenshot({path:report+'/calino-data.png',fullPage:true});
 assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);
 await writeFile(report+'/calino-browser-result.json',JSON.stringify({date:new Date().toISOString(),publicConnection:true,icsExport:true,vcfExport:true,outside,errors},null,2));
 console.log('Public native ICS download passed; no external requests');
} catch(e) {console.log('CHECK FAILURE',e.message,'page errors',errors,'outside',outside,'responses',responses);console.log((await page.locator('body').innerText()).slice(-5000));throw e}
finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close()}

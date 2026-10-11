import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/@playwright/test/index.mjs';
const base=process.env.ACTUAL_TEST_URL, report=process.env.ACTUAL_TEST_REPORT;
assert(base?.startsWith('http://127.0.0.1:') && report?.startsWith('/opt/utilibre/reports/actual-leaves-native-'));
const password=randomUUID();
const headers=await fetch(base);
assert.match(headers.headers.get('content-security-policy'),/connect-src 'self' https:\/\/auth\.utilibre\.org(?:;|$)/);
const worker=await(await fetch(base+'/sw.js')).text();
assert.match(worker,/url:"index.html",revision:"utilibre-privacy-20261011"/);
assert.match(worker,/url:"static\/js\/index\.C1M3OSSF.js",revision:"[a-f0-9]{64}"/);
assert.match(worker,/url:"static\/js\/months\.CGSICdiJ.chunk.js",revision:"[a-f0-9]{64}"/);
let response=await fetch(base+'/account/bootstrap',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
assert.equal(response.status,200);
response=await fetch(base+'/account/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});
assert.equal(response.status,200); const token=(await response.json()).data.token; assert(token);
assert.equal((await fetch(base+'/sync/list-user-files')).status,401);
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:true});
const page=await context.newPage(), external=[],errors=[];
page.setDefaultTimeout(15000);
await context.route('**/*',route=>{
 const url=route.request().url();
 if(/^https?:/.test(url)&&new URL(url).origin!==base){external.push(new URL(url).origin);return route.abort();}
 return route.continue();
});
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base); await page.waitForTimeout(1200);
 await page.locator('input[type="password"]').fill(password);
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Start budgeting',exact:true}).click();
 await page.getByRole('button',{name:'Add account',exact:true}).click();
 await page.getByRole('button',{name:'Create a local account',exact:true}).click();
 await page.getByLabel('Name:',{exact:true}).fill('Fictional cash');
 await page.getByLabel('Balance:',{exact:true}).fill('125.50');
 await page.getByRole('button',{name:'Create',exact:true}).click();
 await page.getByText('Starting Balance',{exact:true}).waitFor();
 await page.getByRole('button',{name:'My Finances',exact:true}).click();
 await page.getByRole('button',{name:'Settings',exact:true}).click();
 const downloadEvent=page.waitForEvent('download');
 await page.getByRole('button',{name:'Export data',exact:true}).click();
 const download=await downloadEvent;
 assert.match(download.suggestedFilename(),/\.zip$/i);
 await download.saveAs(report+'/fictional-budget.zip');
 await page.getByRole('button',{name:'My Finances',exact:true}).click();
 await page.getByText('Switch file',{exact:true}).click();
 await page.getByRole('button',{name:'Import file',exact:true}).click();
 await page.getByText('Actual',{exact:true}).click();
 const pickerEvent=page.waitForEvent('filechooser');
 await page.getByRole('button',{name:'Select file...',exact:true}).click();
 await (await pickerEvent).setFiles(report+'/fictional-budget.zip');
 await page.getByRole('link',{name:/Fictional cash/}).waitFor();
 await page.getByRole('link',{name:/Fictional cash/}).click();
 assert.match(await page.locator('body').innerText(),/125\.50/);
 await page.reload();
 await page.getByRole('link',{name:/Fictional cash/}).waitFor();
 assert.match(await page.locator('body').innerText(),/125\.50/);
 let files=[];
 for(let i=0;i<20;i++){
  const r=await fetch(base+'/sync/list-user-files',{headers:{'x-actual-token':token}});
  assert.equal(r.status,200);files=(await r.json()).data;
  if(files.length)break;
  await page.waitForTimeout(500);
 }
 assert(files.length>0,'Native budget must synchronize to the isolated server');
 const saved=await fetch(base+'/sync/download-user-file',{headers:{'x-actual-token':token,'x-actual-file-id':files[0].fileId}});
 assert.equal(saved.status,200);assert((await saved.arrayBuffer()).byteLength>1000);
 assert.equal((await fetch(base+'/sync/download-user-file',{headers:{'x-actual-file-id':files[0].fileId}})).status,401);
 assert.deepEqual(external,[],'No external browser requests');
 assert.deepEqual(errors,[],'No browser runtime errors');
 const zip=await readFile(report+'/fictional-budget.zip');assert.equal(zip.subarray(0,2).toString(),'PK');
 const result={passed:true,image:process.env.ACTUAL_TEST_IMAGE,testedAt:new Date().toISOString(),browser:'headless Chromium',nativePasswordLogin:true,anonymousReadDenied:true,nativeBudgetCreated:true,fictionalBalance:'125.50',nativeZipExportAndImport:true,reloadPersistence:true,nativeServerSyncAndDownload:true,narrowConnectionCsp:true,nativePrecacheRevisionsUpdated:true,exportBytes:zip.length,exportSha256:createHash('sha256').update(zip).digest('hex'),externalRequests:external,pageErrors:errors,network:'isolated server + loopback; no live data',productionChanged:false,limits:'Synthetic password mode only; production OIDC, old installed-worker upgrade and bank integrations not reconfigured or exercised'};
 await writeFile(report+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}catch(error){await writeFile(report+'/failed-ui.txt',await page.locator('body').innerText());throw error;}
finally{await browser.close();}

// Public HTTPS regression restricted to the explicitly marked, temporarily enabled QA account.
// Run resume-public-qa.py prepare/retire around this check; never use an operator account.
import assert from 'node:assert/strict';
import { readFile,writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHmac,randomBytes } from 'node:crypto';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const root='/opt/utilibre/reports/content-review-20261008/resume-zero-tracking';
const user=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/resume-zero-tracking-qa.json','utf8'));
assert.equal(user.username,'utilibre-check-a');assert.equal(user.prior.is_active,false);assert(!user.retired);
function otp(key){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',Buffer.from(key,'hex')).update(counter).digest();return String((hash.readUInt32BE(hash[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const owner=await browser.newContext({baseURL:'https://cv.utilibre.org'}),anonymous=await browser.newContext({baseURL:'https://cv.utilibre.org'});
const name='Utilibre CV privacy QA '+randomBytes(5).toString('hex');let id;
try {
 const page=await owner.newPage();await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
 await page.locator('input[name="uidField"]').fill(user.username);await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.waitForURL('**/if/user/**');
 await page.goto('/auth/login');await page.getByRole('button',{name:'Utilibre',exact:true}).click();await page.waitForURL('**/dashboard');
 console.log('Synthetic password/MFA/OIDC sign-in passed.');
 let response=await owner.request.post('/api/openapi/resumes',{data:{name,tags:[],withSampleData:true}});assert.equal(response.status(),200);id=await response.json();assert.match(id,/^[a-zA-Z0-9_-]+$/);
 await writeFile(root+'/public-fixture.json',JSON.stringify({id,name}),{mode:0o600});
 response=await owner.request.get(`/api/openapi/resumes/${id}`);assert.equal(response.status(),200);const resume=await response.json();
 resume.data.picture.url='';resume.data.picture.hidden=true;resume.data.basics.name='Fictional Privacy Review';
 const slug='privacy-'+randomBytes(5).toString('hex');
 response=await owner.request.patch(`/api/openapi/resumes/${id}/metadata`,{data:{isPublic:true,showDownloadButtons:true,slug,data:resume.data}});assert.equal(response.status(),200);
 await page.goto(`/builder/${id}`);await page.getByRole('button',{name:/^Share\b/}).click();
 const sheet=page.getByRole('dialog',{name:'Share & export'});await sheet.waitFor();assert.equal(await sheet.locator('#share-stats-title').count(),0);
 // The native sharing link fills its username after the session request resolves.
 await page.waitForFunction(slug=>Array.from(document.querySelectorAll('a')).some(a=>a.textContent?.includes('Open public page')&&new URL(a.href).pathname.split('/').filter(Boolean).length===2&&a.href.endsWith('/'+slug)),slug);
 const publicUrl=await sheet.getByRole('link',{name:'Open public page',exact:true}).getAttribute('href');assert(publicUrl.startsWith('https://cv.utilibre.org/'));
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'More download formats',exact:true}).click();
 await page.getByRole('radio',{name:/^JSON/}).click();const jsonPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download JSON',exact:true}).click();
 const json=await jsonPromise;assert.equal(await json.failure(),null);assert.equal(JSON.parse(await readFile(await json.path(),'utf8')).basics.name,'Fictional Privacy Review');
 const visitor=await anonymous.newPage(),events=[],failures=[];visitor.on('request',r=>{if(/statistics.*download|statistics\/recordDownload/.test(r.url()))events.push(r.url());});
 visitor.on('response',r=>{if(r.status()>=400)failures.push({status:r.status(),path:new URL(r.url()).pathname});});
 visitor.on('pageerror',e=>failures.push({error:e.message.replace(/https?:\/\/[^\s]+/g,'[URL]')}));
 const publicResponse=await visitor.goto(publicUrl);
 try{await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().waitFor();}
 catch(error){await writeFile(root+'/public-page-failure.json',JSON.stringify({status:publicResponse.status(),failures,body:await visitor.locator('body').innerText()},null,2),{mode:0o600});throw error;}
 const pdfPromise=visitor.waitForEvent('download');await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().click();
 const pdf=await pdfPromise;assert.equal(await pdf.failure(),null);assert.equal((await readFile(await pdf.path())).subarray(0,5).toString(),'%PDF-');
 await visitor.reload();await visitor.getByRole('button',{name:'Download PDF',exact:true}).first().waitFor();assert.equal(events.length,0);
 const parts=new URL(publicUrl).pathname.split('/').filter(Boolean);
 response=await anonymous.request.post(`/api/openapi/resumes/${parts[0]}/${parts[1]}/statistics/downloads`,{data:{}});assert.equal(response.status(),200);assert.equal(await response.json(),true);
 const counts=execFileSync('docker',['exec','utilibre-expanded-resume-db-1','psql','-U','resume','-d','resume','-At','-c',`SELECT (SELECT count(*) FROM resume_statistics WHERE resume_id='${id}'),(SELECT count(*) FROM resume_statistics_daily WHERE resume_id='${id}')`],{encoding:'utf8'}).trim();assert.equal(counts,'0|0');
 response=await owner.request.patch(`/api/openapi/resumes/${id}/metadata`,{data:{isPublic:false}});assert.equal(response.status(),200);
 response=await anonymous.request.get(`/api/openapi/resumes/${parts[0]}/${parts[1]}`);assert.equal(response.status(),404);
 await writeFile(root+'/public.json',JSON.stringify({date:new Date().toISOString(),publicHttps:true,syntheticSsoMfa:true,ownerJsonExport:true,publicPdfDownload:true,sharingAndPrivateDenial:true,browserStatisticsRequests:0,fixtureAggregateRows:0,fixtureDailyRows:0,directDownloadCannotCount:true},null,2));
 console.log('Public HTTPS owner JSON/public PDF/sharing and zero-statistics regression passed.');
} finally {
 try {
  if(id){
   const owned=await owner.request.get(`/api/openapi/resumes/${id}`);assert.equal(owned.status(),200);assert.equal((await owned.json()).name,name);
   assert.equal((await owner.request.put(`/api/openapi/documents/resume/${id}/trash`,{data:{}})).status(),200);
   assert.equal((await owner.request.delete(`/api/openapi/documents/resume/${id}`)).status(),200);
   assert.equal((await owner.request.get(`/api/openapi/resumes/${id}`)).status(),404);
   await writeFile(root+'/public-fixture-cleaned.json',JSON.stringify({date:new Date().toISOString(),removed:true}),{mode:0o600});
   console.log('Only the newly created fictional CV was permanently removed through native APIs.');
  }
 } finally {await owner.close();await anonymous.close();await browser.close();}
}

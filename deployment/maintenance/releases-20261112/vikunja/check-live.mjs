// Approved fictional QA identity only. No ordinary user documents are inspected.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHmac} from 'node:crypto';
import {chromium} from '../../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/vikunja-upgrade-20261112';
assert(!fs.existsSync(root+'/live-workflow.json'));
const user=JSON.parse(fs.readFileSync('/opt/utilibre/identity-data/data/private/opengist-native-qa.json'));
assert.equal(user.username,'utilibre-check-a');assert(!user.retired);
const otp=()=>{const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const h=createHmac('sha1',Buffer.from(user.totpKey,'hex')).update(b).digest();return String((h.readUInt32BE(h[19]&15)&0x7fffffff)%1000000).padStart(6,'0');};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const context=await browser.newContext({locale:'en-US',viewport:{width:1365,height:900}}),page=await context.newPage();
const hosts=new Set(),errors=[],responses=[],failedRequests=[],flowStates=[];let count=0,qaId;
context.setDefaultTimeout(30000);
page.on('pageerror',e=>errors.push(e.name));
// The two native frontends and three full page loads exceed 300 asset requests.
// Bound the whole check, not just APIs; no search/proxy queries are performed.
page.on('request',request=>{hosts.add(new URL(request.url()).hostname);if(++count>1000)void context.close();});
page.on('response',async response=>{const u=new URL(response.url());responses.push({host:u.hostname,path:u.pathname,status:response.status()});if(u.pathname.startsWith('/api/v3/flows/executor/'))try{const data=await response.json();flowStates.push({component:data.component,type:data.type,keys:Object.keys(data),redirectOrigin:data.to?new URL(data.to,u.origin).origin:null});}catch{}});
page.on('requestfailed',request=>{const u=new URL(request.url());failedRequests.push({host:u.hostname,path:u.pathname,error:request.failure()?.errorText});});
try{
 await page.goto('https://tasks.utilibre.org/login');
 await page.getByRole('textbox',{name:/username|email/i}).fill(user.username);
 await page.getByRole('button',{name:/continue|log in|sign in/i}).click();
 const passwordStage=page.locator('ak-stage-password');await passwordStage.waitFor();
 await passwordStage.evaluate(async element=>{await element.updateComplete;});
 const password=passwordStage.locator('input[type=password]');await password.waitFor();await page.waitForTimeout(700);
 await password.fill('');await password.pressSequentially(user.password,{delay:25});await password.press('Tab');
 await page.getByRole('button',{name:/continue|log in|sign in/i}).click();
 const mfaStage=page.locator('ak-stage-authenticator-validate');await mfaStage.waitFor();
 await mfaStage.evaluate(async element=>{await element.updateComplete;});
 const code=mfaStage.locator('input[autocomplete="one-time-code"],input[name="code"]').first();await code.waitFor();await page.waitForTimeout(300);await code.pressSequentially(otp(),{delay:50});await code.press('Tab');
 await page.getByRole('button',{name:/continue|verify|sign in|log in/i}).click();
 await page.waitForURL('https://tasks.utilibre.org/');await page.locator('nav').first().waitFor();
 const token=await page.evaluate(()=>localStorage.getItem('token'));assert(token);
 const request=async(method,path,options={},expected=200)=>{const r=await context.request.fetch('https://tasks.utilibre.org/api/v2'+path,{method,headers:{Authorization:'Bearer '+token},timeout:15000,...options});assert.equal(r.status(),expected,method+' '+path);return r;};
 const me=await(await request('GET','/user')).json();assert.equal(me.username,user.username);qaId=me.id;
 const list=r=>Array.isArray(r)?r:r.items;
 const initial=list(await(await request('GET','/projects')).json());
 assert(initial.length<=1&&initial.every(p=>p.title==='Inbox'),'Only a fresh QA account with its native Inbox may be used');
 for(const p of initial)assert.equal(list(await(await request('GET','/projects/'+p.id+'/tasks')).json()).length,0);
 const title='Fictional maintenance check 2026-11-12';
 const project=await(await request('POST','/projects',{data:{title}},201)).json();
 const task=await(await request('POST','/projects/'+project.id+'/tasks',{data:{title:'Fictional task'}},201)).json();
 const done=await(await request('PUT','/tasks/'+task.id,{data:{title:'Fictional completed task',done:true}})).json();assert(done.done);
 const payload=Buffer.from('Fictional attachment for maintenance verification.\n');
 await request('POST','/tasks/'+task.id+'/attachments',{multipart:{files:{name:'fictional.txt',mimeType:'text/plain',buffer:payload}}},201);
 const attachments=list(await(await request('GET','/tasks/'+task.id+'/attachments')).json());assert.equal(attachments.length,1);
 assert((await(await request('GET','/tasks/'+task.id+'/attachments/'+attachments[0].id)).body()).equals(payload));
 await request('POST','/user/export/request',{data:{}});
 for(let n=0;;n++){if(await(await request('GET','/user/export')).json())break;assert(n<30);await new Promise(r=>setTimeout(r,1000));}
 const exported=await(await request('POST','/user/export/download',{data:{}})).body();assert(exported.length>0&&exported.length<1024**2);
 fs.writeFileSync(root+'/fictional-live-export.zip',exported);
 await request('POST','/migration/vikunja-file/migrate',{multipart:{import:{name:'fictional.zip',mimeType:'application/zip',buffer:exported}}});
 for(let n=0;;n++){const s=await(await request('GET','/migration/vikunja-file/status')).json();if(s?.finished_at?.startsWith('20'))break;assert(n<30);await new Promise(r=>setTimeout(r,1000));}
 const allProjects=list(await(await request('GET','/projects')).json());assert(allProjects.every(p=>[title,'Inbox'].includes(p.title)));
 const projects=allProjects.filter(p=>p.title===title);assert.equal(projects.length,2);
 const copy=projects.find(p=>p.id!==project.id),copiedTasks=list(await(await request('GET','/projects/'+copy.id+'/tasks')).json());assert.equal(copiedTasks.length,1);assert(copiedTasks[0].done);
 const files=list(await(await request('GET','/tasks/'+copiedTasks[0].id+'/attachments')).json());
 assert((await(await request('GET','/tasks/'+copiedTasks[0].id+'/attachments/'+files[0].id)).body()).equals(payload));
 await page.reload();await page.locator('nav').first().waitFor();await page.getByText(/Vikunja is loading/).waitFor({state:'hidden'});
 await page.screenshot({path:root+'/live-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.reload();
 await page.locator('nav').first().waitFor({state:'attached'});await page.getByText(/Vikunja is loading/).waitFor({state:'hidden'});
 const hideMenu=page.getByRole('button',{name:'Hide menu',exact:true});if(await hideMenu.isVisible())await hideMenu.click();
 const closeBanner=page.getByRole('button',{name:'Close banner',exact:true});if(await closeBanner.isVisible())await closeBanner.click();
 const mobileNoOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);await page.screenshot({path:root+'/live-mobile.png',fullPage:true});
 for(const p of projects){await request('DELETE','/projects/'+p.id,{},204);await request('POST','/projects/'+p.id+'/restore');await request('DELETE','/projects/'+p.id,{},204);await request('DELETE','/projects/'+p.id+'/permanent',{},204);}
 assert(list(await(await request('GET','/projects')).json()).every(p=>p.title==='Inbox'));assert.equal(list(await(await request('GET','/projects/deleted')).json()).length,0);
 assert.deepEqual(errors,[]);assert(count<=1000);assert.deepEqual([...hosts].filter(h=>!['tasks.utilibre.org','auth.utilibre.org'].includes(h)),[]);
 fs.writeFileSync(root+'/live-workflow.json',JSON.stringify({passed:true,date:new Date().toISOString(),version:'2.8.0',publicOidcMfa:true,syntheticAccountOnly:true,nativeTaskAttachmentExportImport:true,trashRestorePermanentDelete:true,exportedAttachmentBytes:true,browser:browser.version(),viewports:['1365x900','390x844'],mobileNoOverflow,hosts:[...hosts].sort(),javascriptErrors:errors,deviceCoverage:'Chromium desktop and mobile viewport emulation; not physical phone',mobileLimitation:mobileNoOverflow?null:'Native dashboard overflows at 390px; functional checks passed, mobile layout needs upstream review.'},null,2)+'\n');
 console.log('Live Vikunja OIDC/MFA, task/attachment/export/import, Trash/restore/permanent deletion passed.');
}catch(error){
 const current=new URL(page.url());
 await page.screenshot({path:root+'/live-login-failure.png',fullPage:true});
 fs.writeFileSync(root+'/live-failure-'+Date.now()+'.json',JSON.stringify({origin:current.origin,path:current.pathname,message:error.name,body:(await page.locator('body').innerText()).slice(0,4000),responses,failedRequests,errors,flowStates},null,2));
 throw error;
}finally{
 await browser.close();
 if(qaId){
  // This ID was authenticated above as the explicit disposable QA identity.
  assert(Number.isInteger(qaId)&&qaId>0);
  cp.execFileSync('docker',['exec','utilibre-vikunja-vikunja-1','/app/vikunja/vikunja','user','delete',String(qaId),'--now','--confirm'],{stdio:['ignore','ignore','ignore'],timeout:30000});
  fs.writeFileSync(root+'/live-qa-cleanup.json',JSON.stringify({date:new Date().toISOString(),syntheticAccountDeletedNatively:true})+'\n');
 }
}

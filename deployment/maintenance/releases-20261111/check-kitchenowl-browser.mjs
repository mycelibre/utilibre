import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '/home/ubuntu/freetools/portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/held-upgrades-20261111/kitchenowl/browser-native';
const {base,issuer,imageId}=JSON.parse(fs.readFileSync(dir+'/browser-inputs.json'));
const browser=await chromium.launch(),context=await browser.newContext({ignoreHTTPSErrors:true,locale:'en-US'});
const external=new Set(),errors=[];let token;const responses=[];const navigation=[];
await context.route('**/*',r=>{const u=new URL(r.request().url());if(['http:','https:'].includes(u.protocol)&&![base,issuer].includes(u.origin)){external.add(u.origin);return r.abort();}return r.continue();});
await context.exposeBinding('fixtureHistory', (_source, data) => navigation.push(data));
await context.addInitScript(() => {
  const safe = value => {try {const u=new URL(value,location.href);return {path:u.pathname,queryKeys:[...u.searchParams.keys()],fragment:!!u.hash};} catch{return {invalid:true};}};
  window.fixtureHistory({event:'initial',...safe(location.href)});
  for (const method of ['pushState','replaceState']) {
    const original=history[method];history[method]=function(...args){window.fixtureHistory({event:method,...safe(args[2]||location.href)});return original.apply(this,args);};
  }
});
context.on('request', r => {if(r.isNavigationRequest()){const u=new URL(r.url());navigation.push({event:'navigationRequest',path:u.pathname,queryKeys:[...u.searchParams.keys()],method:r.method()});}});
const p=await context.newPage();p.setDefaultTimeout(60000);
p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
p.on('pageerror',e=>errors.push(e.message));
p.on('response',async r=>{if(r.url().startsWith(base+'/api/')){const row={path:new URL(r.url()).pathname,status:r.status()};if(r.status()>=400)row.error=(await r.text()).slice(0,400);responses.push(row);}if(['/api/auth/callback','/api/auth/refresh'].includes(new URL(r.url()).pathname)&&r.ok()){const d=await r.json();token=d.access_token;responses.push({callbackKeys:Object.keys(d)});}});
async function api(path,method='GET',data){const r=await context.request.fetch(base+'/api'+path,{method,headers:{Authorization:'Bearer '+token},...(data?{data}:{})});assert(r.ok(),method+' '+path+': '+r.status());return r.json();}
try{
 await p.goto(base+'/signin');
 await p.locator('flt-semantics-placeholder').evaluate(e=>e.click());
 const callback=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/callback',{timeout:60000});
 await p.getByRole('button',{name:'Sign in with OIDC'}).click();
 const result=await callback;assert.equal(result.status(),200);token=(await result.json()).access_token;
 await p.waitForURL(u=>u.origin===base&&u.pathname.startsWith('/household'));
 assert(token,'Native OIDC callback did not issue a token');
 const user=await api('/user');assert.equal(user.username,'fictional_oidc_a');
 const household=await api('/household','POST',{name:'Fictional workshop kitchen'});
 await api('/household/'+household.id+'/import','POST',{items:[{name:'Fictional apples'}],recipes:[{name:'Fictional apple bowl',description:'Cut fictional apples.',yields:2,items:[{name:'Fictional apples',description:'2 pieces'}],tags:['Fictional']}],shoppinglists:['Fictional groceries']});
 const initialToken=token;await p.reload({waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelector('flt-semantics-placeholder')||document.querySelector('flt-semantics'));const enable=p.locator('flt-semantics-placeholder');if(await enable.count())await enable.evaluate(e=>e.click());
 await p.getByRole('button',{name:/Fictional workshop kitchen/}).first().waitFor();
 assert.notEqual(token,initialToken,'Reload must use the native refreshed session');const oldSession=await context.request.get(base+'/api/user',{headers:{Authorization:'Bearer '+initialToken}});assert.equal(oldSession.status(),401);
 const exported=await api('/household/'+household.id+'/export');assert(exported.recipes.some(x=>x.name==='Fictional apple bowl'));
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:dir+'/mobile.png',fullPage:true});
 assert.deepEqual([...external],[]);assert.deepEqual(errors,[]);
 await api('/household/'+household.id,'DELETE');await api('/user','DELETE');
 fs.writeFileSync(dir+'/result.json',JSON.stringify({passed:true,imageId,nativeOidc:true,nativeHouseholdImportExport:true,reloadPersistence:true,staleSessionRejected:true,nativeDeletion:true,mobileViewport:390,externalOrigins:[...external],errors,network:'internal fixture plus synthetic issuer only',productionChanged:false,realPhone:false},null,2)+'\n');
 console.log('KitchenOwl native OIDC/browser/import/export/privacy checks passed.');
}catch(e){fs.writeFileSync(dir+'/failure.txt',String(e.stack));fs.writeFileSync(dir+'/diagnostics.json',JSON.stringify({navigation,pages:context.pages().length,external:[...external],errors,responses,tokenReceived:Boolean(token),url:p.url().split('?')[0],body:await p.locator('body').innerText().catch(()=>null)}));await p.screenshot({path:dir+'/failure.png',fullPage:true});throw Error('KitchenOwl isolated browser gate failed; diagnostics retained');}
finally{await context.close();await browser.close();}

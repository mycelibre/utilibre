// Native first-admin form and settings; no email is sent. Run only on a new instance.
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
process.umask(0o077);
const base='https://wishlist.utilibre.org';
const privatePath='/opt/utilibre/wishlist/private';
let admin;try{admin=JSON.parse(await readFile(privatePath+'/admin.json','utf8'));}catch{admin={username:'utilibre-admin',email:'admin@utilibre.org',name:'Utilibre administrator',password:randomBytes(30).toString('base64url')};await writeFile(privatePath+'/admin.json',JSON.stringify(admin),{mode:0o600});}
const oidc=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/wishlist-oidc.json','utf8'));
const browser=await chromium.launch();const context=await browser.newContext({locale:'en-US',serviceWorkers:'block'});const external=[];
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push(u.hostname);return route.abort();}const r=await route.fetch({url:'http://127.0.0.1:3193'+u.pathname+u.search,maxRedirects:0});await route.fulfill({response:r});});
const page=await context.newPage();
try{
 await page.goto(base+'/setup-wizard/step/1');
 for(const key of ['name','username','email','password'])await page.locator(`[name="${key}"]`).fill(admin[key]);
 await page.locator('#confirmpassword').fill(admin.password);
 await page.locator('button[type="submit"]').click();
 await page.waitForURL('**/setup-wizard/step/2');
 const result=await page.evaluate(async ({oidc})=>{const f=new URLSearchParams({enableSuggestions:'true',suggestionMethod:'approval',claimsShowName:'true',claimsRequireEmail:'true',passwordStrength:'2',enableOIDC:'true',oidcDiscoveryUrl:'https://auth.utilibre.org/application/o/wishlist/',oidcClientId:oidc.client_id,oidcClientSecret:oidc.client_secret,oidcProviderName:'Utilibre',oidcAutoRegister:'true',oidcEnableSync:'true',oidcNameClaim:'name',oidcUsernameClaim:'preferred_username'});const r=await fetch('/admin/settings?/settings',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-sveltekit-action':'true'},body:f});return {status:r.status,text:await r.text()};},{oidc});
 assert.equal(result.status,200);assert(result.text.includes('success'));
 // Keep the private bootstrap admin session for native verification; no secret output.
 await context.storageState({path:privatePath+'/admin-browser.json'});
 const denied=await fetch('http://127.0.0.1:3193/signup');assert.equal(denied.status,401);
 assert.equal(external.length,0);
 await writeFile('/opt/utilibre/reports/wishlist-20261009/bootstrap-result.json',JSON.stringify({checkedAt:new Date().toISOString(),nativeAdmin:true,signupClosed:true,oidcConfigured:true,externalHosts:external},null,2));
 console.log('Wishlist native operator bootstrap complete; public signup closed; OIDC configured.');
}catch(e){await page.screenshot({path:'/opt/utilibre/reports/wishlist-20261009/bootstrap-failure.png',fullPage:true});throw e;}finally{await context.unrouteAll({behavior:'ignoreErrors'});await browser.close();}

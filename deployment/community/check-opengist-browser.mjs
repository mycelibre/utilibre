import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHmac} from 'node:crypto';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const user=JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/opengist-native-qa.json','utf8'));
assert.equal(user.username,'utilibre-check-a');assert(!user.retired);
function otp(key){const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const hash=createHmac('sha1',Buffer.from(key,'hex')).update(counter).digest();return String((hash.readUInt32BE(hash[19]&15)&0x7fffffff)%1000000).padStart(6,'0');}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const ctx=await browser.newContext(),requests=[],errors=[];ctx.setDefaultTimeout(30000);ctx.setDefaultNavigationTimeout(30000);
try{
 await ctx.route('https://auth.utilibre.org/**',async route=>{
 const response=await route.fetch({maxRedirects:0});const location=response.headers().location;
 if(location?.startsWith('https://snippets.utilibre.org/')) {await route.fulfill({response,status:200,headers:{...response.headers(),location:'','content-type':'text/html','content-security-policy':'','content-length':''},body:'<script>location.href='+JSON.stringify(location)+';</script>'});return;}
 await route.fulfill({response});
 });
 await ctx.route('https://snippets.utilibre.org/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  const response=await ctx.request.fetch('http://10.10.1.43:3191'+url.pathname+url.search,{method:request.method(),headers:{...request.headers(),host:'snippets.utilibre.org'},data:request.postDataBuffer()??undefined,maxRedirects:0});
  console.log('Intercept:',url.pathname,response.status()); const location=response.headers().location;
  if(location && response.status()>=300 && response.status()<400){await route.fulfill({response,status:200,headers:{...response.headers(),location:'','content-type':'text/html','content-security-policy':'','content-length':''},body:'<script>location.href='+JSON.stringify(new URL(location,request.url()).href)+';</script>'});return;}
  await route.fulfill({response});
 });
 const page=await ctx.newPage();page.on('framenavigated',f=>{if(f===page.mainFrame())console.log('Page:',new URL(f.url()).origin+new URL(f.url()).pathname)});page.on('request',r=>requests.push(new URL(r.url()).hostname));page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
 await page.locator('input[name="uidField"]').fill(user.username);await page.getByRole('button',{name:'Log in',exact:true}).click();
 await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));await page.getByRole('button',{name:'Continue',exact:true}).click();await page.waitForURL('**/if/user/**');
 await page.goto('https://snippets.utilibre.org/-/login');await page.locator('a[href$="/oauth/openid-connect"]').click();
 await page.waitForURL('https://snippets.utilibre.org/oauth/register').catch(async e=>{await writeFile('/opt/utilibre/reports/new-services-20261009/opengist-browser-failure.txt',await page.locator('body').innerText());throw e;});
 await page.locator('input[name="username"]').fill('opengist-oidc-check');
 await page.locator('form').filter({has:page.locator('input[name="username"]')}).locator('button[type="submit"]').click();
 await page.waitForURL('https://snippets.utilibre.org/');
 assert.equal(await page.getByRole('link',{name:'More tools from Utilibre / Más herramientas de Utilibre',exact:true}).count(),1);
 const admin=await ctx.request.get('http://10.10.1.43:3191/-/admin-panel',{headers:{host:'snippets.utilibre.org'}});assert.equal(admin.status(),404);
 await page.goto('https://snippets.utilibre.org/-/settings');
 await writeFile('/opt/utilibre/reports/new-services-20261009/opengist-browser-state.json',JSON.stringify(await ctx.storageState()),{mode:0o600});
 assert.deepEqual([...new Set(requests)].filter(h=>!['auth.utilibre.org','snippets.utilibre.org'].includes(h)),[]);
 await writeFile('/opt/utilibre/reports/new-services-20261009/opengist-browser.json',JSON.stringify({nativeOidcMfa:true,approvedQaOnly:true,firstOidcUserNotAdmin:true,nativeFooter:true,hosts:[...new Set(requests)],javascriptErrors:errors,transport:'canonical URL intercepted only to private gateway; public edge pending'},null,2));
 console.log('Native MFA/OIDC, non-admin approved signup, native footer and no third-party browser requests passed.');
}finally{await ctx.close();await browser.close();}

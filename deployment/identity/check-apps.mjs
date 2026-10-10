// Real browser SSO checks with disposable QA accounts. Never use owner MFA.
// --private routes app browser requests directly to their private backends;
// Authentik and server-to-server OIDC still use verified public HTTPS.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const capacityRun = process.env.UTILIBRE_CAPACITY_CHECK_RUN;
if (capacityRun) assert.match(capacityRun, /^[a-z0-9]{1,12}$/);
const users = JSON.parse(readFileSync(`/opt/utilibre/identity-data/data/private/${capacityRun ? `capacity-users-${capacityRun}` : 'check-users'}.json`, 'utf8'));
const ports = {'cv.utilibre.org':3130,'design.utilibre.org':3131,'budget.utilibre.org':3132,'wakapi.utilibre.org':3136};
const privateMode = process.argv.includes('--private');
const only = process.env.CHECK_APP;
function otp(hex) {
  const counter=Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));
  const digest=createHmac('sha1',Buffer.from(hex,'hex')).update(counter).digest();
  return String((digest.readUInt32BE(digest[19]&15)&0x7fffffff)%1000000).padStart(6,'0');
}
const browser = await chromium.launch();
try {
  for(const user of users) {
    const statePath=`/opt/utilibre/identity-data/data/private/${user.username}-browser.json`;
    const saved=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):undefined;
    // Actual's out-of-line IndexedDB keys cannot be restored by Playwright;
    // preserve web cookies/storage and exercise its login again instead.
    if(saved) for(const origin of saved.origins) delete origin.indexedDB;
    const context = await browser.newContext(saved?{storageState:saved}:{});
    if(privateMode) await context.route('https://*.utilibre.org/**',async route=>{
      const request=route.request(), url=new URL(request.url()), port=ports[url.hostname];
      if(!port) return route.continue();
      try {
        const response=await route.fetch({url:`http://10.10.1.43:${port}${url.pathname}${url.search}`,headers:{...request.headers(),host:url.hostname,'x-forwarded-proto':'https'},maxRedirects:0});
        await route.fulfill({response});
      } catch { await route.abort().catch(()=>{}); }
    });
    const page=await context.newPage();
    page.on('pageerror', error=>console.log('Page error',String(error).slice(0,180)));
    page.on('console', message=>{if(message.type()==='error') console.log('Browser console',message.text().replace(/https?:\/\/[^\s]+/g,'[URL]').slice(0,180));});
    if(!existsSync(statePath)) {
    await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
    await page.locator('input[name="uidField"]').fill(user.username);
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));
    await page.getByRole('button',{name:'Continue',exact:true}).click();
    await page.waitForURL('**/if/user/**');
    console.log(user.username,'password + MFA accepted');
    writeFileSync(statePath,JSON.stringify(await context.storageState()),{mode:0o600});
    }
    for(const app of ['resume','penpot','actual','wakapi']) {
      if(only && app!==only) continue;
      const origin={resume:'https://cv.utilibre.org',penpot:'https://design.utilibre.org',actual:'https://budget.utilibre.org',wakapi:'https://wakapi.utilibre.org'}[app];
      await page.goto(origin+({resume:'/auth/login',penpot:'/#/auth/login',actual:'/',wakapi:'/login'}[app]));
      await page.waitForTimeout(3500);
      if(app==='resume' && await page.getByRole('button',{name:'Utilibre',exact:true}).count()) await page.getByRole('button',{name:'Utilibre',exact:true}).click();
      if(app==='actual' && await page.getByRole('button',{name:'Sign in with OpenID',exact:true}).count()) await page.getByRole('button',{name:'Sign in with OpenID',exact:true}).click();
      if(app==='wakapi' && await page.getByRole('link',{name:'Login with Utilibre',exact:true}).count()) await page.getByRole('link',{name:'Login with Utilibre',exact:true}).click();
      if(app==='penpot' && await page.getByText('Utilibre',{exact:true}).count()) await page.getByText('Utilibre',{exact:true}).click();
      await page.waitForTimeout(app==='penpot'?10000:4000);
      if(app==='penpot' && await page.getByText(/create an account/i).count()) {
        const name=page.locator('input[name="fullname"]');
        if(await name.count()) await name.fill(`Utilibre synthetic check ${user.username.slice(-1)}`);
        await page.getByText(/create an account/i).click();
        await page.waitForTimeout(6000);
      }
      const body=await page.locator('body').innerText();
      assert.equal(new URL(page.url()).origin,origin,'SSO must return to the application');
      if(app==='resume') assert.match(new URL(page.url()).pathname,/dashboard/);
      if(app==='penpot') assert.match(new URL(page.url()).hash,/dashboard/);
      if(app==='actual') assert.ok(body.includes(user.username)||body.includes(capacityRun ? `Utilibre capacity QA ${user.username.includes('-a-') ? 'a' : 'b'}` : `Utilibre synthetic check ${user.username.slice(-1)}`),'Actual must show the correct signed-in identity');
      if(app==='wakapi') { assert.match(new URL(page.url()).pathname,/summary/); assert.doesNotMatch(body,/5\s*€|€\s*5/); }
      console.log(user.username,app,privateMode?'private-route SSO passed':'public HTTPS SSO passed');
      if(app==='actual' && process.env.CHECK_CREATE==='1') {
        await page.getByRole('button',{name:'Start budgeting',exact:true}).click();
        await page.waitForTimeout(4000);
        console.log('Actual creation controls',await page.getByRole('button').allTextContents(),(await page.locator('body').innerText()).slice(0,700));
      }
      writeFileSync(statePath,JSON.stringify(await context.storageState()),{mode:0o600});
    }
    await context.unrouteAll({behavior:'ignoreErrors'});
    await context.close();
  }
} catch(error) {
  console.error(String(error).replace(/https?:\/\/[^\s]+/g,'[URL withheld]').slice(0,900));
  process.exitCode=1;
} finally { await browser.close(); }

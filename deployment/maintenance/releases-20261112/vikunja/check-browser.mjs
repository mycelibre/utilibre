// Called only inside check-oidc.py's network-none namespace.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from '../../../../portal/node_modules/playwright-core/index.mjs';
const output = process.argv[2];
assert(output?.startsWith('/') && !fs.existsSync(output));
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const outside = new Set(), hosts = new Set(), accounts = [], errors = [];
const failures = [];
let activePage;
try {
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({viewport:i ? {width:390,height:844} : {width:1365,height:900}});
    // A network-none namespace only has loopback. Tell Chromium the fixture's
    // local HTTP service is online; routing below still rejects every external
    // origin and the namespace has no egress. This is not an offline-PWA test.
    await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'onLine', {get:()=>true}));
    await context.route('**/*', async route => {
      const origin = new URL(route.request().url()).origin;
      hosts.add(origin);
      if (!['http://127.0.0.1:3456','http://127.0.0.1:8765'].includes(origin)) {
        outside.add(origin); await route.abort(); return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', error => errors.push(error.name));
    page.on('response',async response => {
      if (response.status() >= 400 && new URL(response.url()).pathname.includes('/auth/openid/')) {
        failures.push({status:response.status(),body:(await response.text()).slice(0,900)});
      }
    });
    for (let attempt = 0; ; attempt++) {
      try { await page.goto('http://127.0.0.1:3456/login'); break; }
      catch (error) { if (attempt > 30) throw error; await new Promise(resolve=>setTimeout(resolve,300)); }
    }
    // Native single-provider mode may already redirect directly to the IdP.
    if (new URL(page.url()).pathname === '/login') {
      await Promise.race([
        page.getByText(/Utilibre fixture/).click({timeout:30000}),
        page.waitForURL('http://127.0.0.1:3456/', {timeout:30000}),
      ]);
    }
    await page.waitForURL('http://127.0.0.1:3456/',{timeout:30000});
    await page.locator('nav').first().waitFor({state:'attached',timeout:30000});
    const user = await page.evaluate(async () => {
      const response = await fetch('/api/v2/user', {headers:{Authorization:'Bearer '+localStorage.getItem('token')}});
      if (!response.ok) throw new Error('Synthetic user query failed: '+response.status);
      return response.json();
    });
    accounts.push(user.id);
    assert.equal(user.username,'fictional-'+(i+1));
    await page.reload();
    await page.locator('nav').first().waitFor({state:'attached'});
    await page.getByText(/Vikunja is loading/).waitFor({state:'hidden',timeout:15000});
    await page.getByRole('heading',{name:new RegExp('Fictional User '+(i+1))}).waitFor();
    await page.screenshot({path:output.replace(/\.json$/,i ? '-mobile.png' : '-desktop.png'),fullPage:true});
    await context.close();
  }
  assert.notEqual(accounts[0],accounts[1]);
  assert.deepEqual([...outside],[]);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(output,JSON.stringify({passed:true,date:new Date().toISOString(),twoIndependentOidcSessions:true,
    nativeDashboardAndReload:true,browser:browser.version(),viewports:['1365x900','390x844'],
    requestedOrigins:[...hosts].sort(),outsideOrigins:[...outside],javascriptErrors:errors,
    network:'none with namespace-local synthetic provider',productionChanged:false,
    limitation:'Synthetic OIDC provider, not production Authentik/MFA. Mobile viewport is emulation, not phone hardware. navigator.onLine is true for namespace-local HTTP; no offline claim.'},null,2)+'\n',{mode:0o600});
} catch (error) {
  // Only disposable fictional data exists in this network namespace.
  if (activePage) console.error(JSON.stringify({path:new URL(activePage.url()).pathname,
    text:(await activePage.locator('body').innerText()).slice(0,1500),outside:[...outside],errors,failures}));
  throw error;
} finally { await browser.close(); }

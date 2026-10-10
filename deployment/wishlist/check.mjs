import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const origin='https://wishlist.utilibre.org',report='/opt/utilibre/reports/wishlist-20261009';
process.umask(0o077);
const b=await chromium.launch();const c=await b.newContext({storageState:'/opt/utilibre/reports/new-services-20261009/opengist-browser-state.json',serviceWorkers:'block',locale:'en-US'});const hosts=[],errors=[];const p=await c.newPage();p.setDefaultTimeout(20000);p.on('request',r=>hosts.push(new URL(r.url()).hostname));p.on('pageerror',e=>errors.push(e.message));
try{
 await p.goto(origin+'/login');await p.getByRole('button',{name:'Sign in with Utilibre',exact:true}).click();
 await p.waitForURL(u=>u.origin===origin&&!u.pathname.startsWith('/login'));
 await p.waitForLoadState('domcontentloaded');
 await c.storageState({path:'/opt/utilibre/wishlist/private/qa-browser.json'});
 console.log('Wishlist OIDC completed; current native page:',new URL(p.url()).pathname);
 console.log((await p.locator('body').innerText()).slice(0,1000));
 await writeFile(report+'/oidc-result.json',JSON.stringify({checkedAt:new Date().toISOString(),nativeOidc:true,transport:'real public HTTPS',hosts:[...new Set(hosts)],errors},null,2));
 assert.deepEqual([...new Set(hosts)].filter(h=>!['wishlist.utilibre.org','auth.utilibre.org'].includes(h)),[]);
}catch(e){await p.screenshot({path:report+'/check-failure.png',fullPage:true});await writeFile(report+'/check-failure.txt',String(e.stack));throw e;}finally{await c.close();await b.close();}

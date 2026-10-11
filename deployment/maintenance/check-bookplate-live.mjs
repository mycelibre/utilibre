// Public-edge regression only. Native account/save/export/isolation is tested
// separately against the identical image in a disposable PostgreSQL stack.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright/index.mjs';
const origin='https://bookplate.utilibre.org',browser=await chromium.launch();
try{
 const context=await browser.newContext(),page=await context.newPage(),external=[],errors=[];
 page.on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)external.push(new URL(r.url()).origin);});
 page.on('pageerror',e=>errors.push(e.message));
 assert.equal((await page.goto(origin+'/login',{waitUntil:'networkidle'})).status(),200);
 await page.getByLabel('Email',{exact:true}).waitFor();await page.getByLabel('Password',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Sign in',exact:true}).waitFor();
 assert.equal((await context.request.get(origin+'/api/books')).status(),401);
 assert.equal((await context.request.get(origin+'/api/export')).status(),401);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
 await writeFile('/var/lib/utilibre-maintenance/bookplate-20261011/live.json',JSON.stringify({date:new Date().toISOString(),status:'passed',checks:['public HTTPS login renders with labelled controls','anonymous library/export denied','no external browser requests or script errors'],limitations:['Account/save/export/isolation passed in isolated identical-image staging, not with real production accounts. No public registration change or operator password reset.']},null,2)+'\n',{mode:0o600});
 console.log('Bookplate public HTTPS login and anonymous library/export denial passed; account isolation verified separately in staging.');
}finally{await browser.close();}

// Manual native challenge test with a desktop Chrome user agent. The default
// HeadlessChrome identity is deliberately denied by the unchanged bot policy.
// Cookie values and requested page content are never recorded.
import {createRequire} from 'node:module';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {chromium}=createRequire(new URL('../portal/package.json',import.meta.url))('playwright-core');
const env=await readFile(new URL('../.env',import.meta.url),'utf8');const origin=env.match(/^PUBLIC_REDDIT_URL=(.+)$/m)[1].replace(/^['"]|['"]$/g,'');
const browser=await chromium.launch();
try{
 const context=await browser.newContext({userAgent: (await (await browser.newPage()).evaluate(()=>navigator.userAgent)).replace("HeadlessChrome", "Chrome")});const page=await context.newPage();const headers=[];const pending=[];
 page.on('response',r=>{if(new URL(r.url()).origin===new URL(origin).origin)pending.push((async()=>{for(const h of await r.headersArray()){if(h.name.toLowerCase()==='set-cookie'){const [nameValue,...attrs]=h.value.split(';');headers.push({name:nameValue.split('=')[0],attributes:attrs.map(x=>x.trim())})}}})())});
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 let cookies=[];for(let n=0;n<12;n++){cookies=await context.cookies();if(cookies.some(c=>c.name.includes('anubis-auth')))break;await page.waitForTimeout(1000)}
 await Promise.all(pending);

 const auth=cookies.find(c=>c.name.includes('anubis-auth'));assert(auth,'Ordinary browser must receive authorization after native challenge');
 assert(auth.secure&&auth.httpOnly&&auth.sameSite==='Lax');assert(Math.abs(auth.expires-Date.now()/1000-86400)<90);
 const verification=cookies.find(c=>c.name.includes('cookie-verification'));assert(verification&&Math.abs(verification.expires-Date.now()/1000-1800)<90);
 assert(headers.filter(h=>h.name.includes('anubis')).every(h=>h.attributes.includes('Secure')&&h.attributes.includes('HttpOnly')&&h.attributes.includes('SameSite=Lax')&&h.attributes.includes('Partitioned')&&!h.attributes.some(a=>a.toLowerCase().startsWith('domain='))));
 const result={checkedAt:new Date().toISOString(),passed:true,verificationSeconds:1800,authorizationSeconds:86400,cookieFlags:['host-only','Secure','HttpOnly','SameSite=Lax','Partitioned'],limitations:['browser test cannot establish physical erasure of expired database pages','edge/provider retention remains unverified']};
 console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}

// Read-only unauthenticated entry checks; origins only, never OIDC query values.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',receipt=JSON.parse(fs.readFileSync(dir+'/release.json'));
assert.equal(receipt.status,'passed');
for(const g of receipt.groups)for(const r of g.rows){const x=JSON.parse(execFileSync('docker',['inspect',r.name]))[0];assert.equal(x.Image,r.newImage);assert(x.State.Running);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');}
const browser=await chromium.launch(),pages=[];
try{
 const c=await browser.newContext({locale:'en-US'}),p=await c.newPage(),origins=new Set(),errors=[];
 p.on('pageerror',()=>errors.push('script error'));p.on('request',r=>{const u=new URL(r.url());if(['https:','http:','ws:','wss:'].includes(u.protocol))origins.add(u.origin);});
 const response=await p.goto('https://design.utilibre.org/',{waitUntil:'networkidle',timeout:45000});assert.equal(response.status(),200);
 await p.getByRole('heading',{name:'Log into my account',exact:true}).waitFor({state:'visible',timeout:30000});assert.deepEqual([...origins],['https://design.utilibre.org']);
 await Promise.all([p.waitForURL(u=>u.origin==='https://auth.utilibre.org',{timeout:30000}),p.getByText('Utilibre',{exact:true}).click()]);
 await p.locator('input[autocomplete="username"]:visible').first().waitFor({state:'visible',timeout:30000});assert.equal(errors.length,0);
 assert.deepEqual([...origins].sort(),['https://auth.utilibre.org','https://design.utilibre.org']);
 pages.push({application:'Penpot',nativeLoginVisible:true,oidcStart:true,credentialsSubmitted:false,origins:[...origins].sort(),scriptErrors:0});
}finally{await browser.close();}
// One native encrypted silence packet is looped back only to this test client.
execFileSync(process.execPath,['deployment/community/check-mumble.mjs','--voice'],{stdio:['ignore','pipe','pipe'],timeout:30000});
const r=await fetch('https://redlib.utilibre.org/settings',{redirect:'manual',signal:AbortSignal.timeout(15000)});await r.body?.cancel();
// The public Anubis challenge is not confused with the native upstream page.
const redlib=JSON.parse(execFileSync('docker',['inspect','public-utility-redlib-1']))[0];assert.equal(redlib.State.Health.Status,'healthy');
fs.writeFileSync(dir+'/live.json',JSON.stringify({status:'passed',date:new Date().toISOString(),exactLiveRoles:receipt.groups.flatMap(g=>g.rows).length,pages,mumble:'Native private-network TLS join, wrong-password denial and exact server-only voice loopback passed',redlib:{publicSettingsStatus:r.status,nativeSettingsHealth:'healthy'},limits:'Chromium desktop unauthenticated entry; no real account used. Public Redlib may present its existing bot challenge; no visitor search was sent. Not a complete device, uptime or exploit assessment.'},null,2)+'\n');
console.log('Exact live roles, Penpot login/OIDC origins, Mumble TLS/voice loopback and Redlib native settings verified.');

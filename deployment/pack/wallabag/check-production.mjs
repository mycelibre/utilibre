// Production runtime, private loopback listener, operator-owned synthetic data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
process.umask(0o077);
const container='utilibre-wallabag-app-1', origin='http://127.0.0.1:33177';
const privatePath='/opt/utilibre/pack-secrets/wallabag-smoke.json';
const fixtureCode=(await readFile(new URL('./smoke-fixture.php',import.meta.url),'utf8')).replace(/^<\?php/,'');
let data;
if(process.argv.includes('--existing')) {
  data=JSON.parse(await readFile(privatePath,'utf8'));
  if(!data.syntheticOnly) {
    Object.assign(data,JSON.parse(execFileSync('docker',['exec','-i',container,'php','-r',fixtureCode],{input:JSON.stringify(data),encoding:'utf8'})));
    await writeFile(privatePath,JSON.stringify(data)+'\n',{mode:0o600});
  }
}
else {
  const stamp=Math.floor(Date.now()/1000);
  data={action:'seed',a:`qa-wallabag-${stamp}-a`,b:`qa-wallabag-${stamp}-b`,password:randomBytes(30).toString('base64url')};
  // Refuse to lose credentials for a still-existing rehearsal.
  await writeFile(privatePath,JSON.stringify(data)+'\n',{mode:0o600,flag:'wx'});
  Object.assign(data,JSON.parse(execFileSync('docker',['exec','-i',container,'php','-r',fixtureCode],{input:JSON.stringify(data),encoding:'utf8'})));
  await writeFile(privatePath,JSON.stringify(data)+'\n',{mode:0o600});
}
assert(data.syntheticOnly && Number.isSafeInteger(data.entryId));
const output=await mkdtemp('/tmp/utilibre-wallabag-production-');
const browser=await chromium.launch();
const outside=new Set(), errors=[], assets=[];
async function context(width) {
  const ctx=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  ctx.setDefaultTimeout(15000);ctx.setDefaultNavigationTimeout(20000);
  ctx.on('response',r=>{if(new URL(r.url()).origin!==origin)outside.add(new URL(r.url()).origin); if(r.status()>=400&&/\.(js|css|woff2?)(\?|$)/.test(r.url()))assets.push(new URL(r.url()).pathname);});
  ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  return ctx;
}
async function login(ctx,username) {
  const p=await ctx.newPage(); await p.goto(origin+'/login');
  await p.locator('[name="_username"]').fill(username);await p.locator('[name="_password"]').fill(data.password);
  await Promise.all([p.waitForURL(u=>u.pathname!=='/login'),p.locator('button[name="send"]').click()]);return p;
}
try {
  const a=await context(1280),p=await login(a,data.a);
  await p.locator('#_auth_code').waitFor(); assert.equal(await p.locator('[name="_csrf_token"]').count(),1);
  const code=execFileSync('docker',['exec',container,'php','-r','require "vendor/autoload.php"; echo OTPHP\\TOTP::create("JBSWY3DPEHPK3PXP")->now();'],{encoding:'utf8'});
  await p.locator('#_auth_code').fill(code);
  await Promise.all([p.waitForURL(u=>!u.pathname.startsWith('/2fa')),p.locator('button[name="send"]').click()]);
  assert.equal((await p.goto(`${origin}/view/${data.entryId}`)).status(),200);
  assert.match(await p.locator('#article').innerText(),/Fictional local article/);
  assert.equal(await p.locator('#article img').evaluate(e=>getComputedStyle(e).display),'none');
  await p.setViewportSize({width:390,height:844}); await p.reload(); await p.waitForTimeout(400); await p.screenshot({path:output+'/article-mobile.png'});
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const format of ['json','txt','pdf','epub']) {
    const r=await a.request.get(`${origin}/export/${data.entryId}.${format}`);assert.equal(r.status(),200,format);
    const bytes=await r.body(); assert(bytes.length>20,format);
    if(format==='pdf')assert.equal(bytes.subarray(0,5).toString(),'%PDF-');
    if(format==='epub')assert.equal(bytes.subarray(0,2).toString(),'PK');
    if(format==='json')assert.match(bytes.toString(),/Fictional local article/);
  }
  await p.goto(origin+'/new');await p.locator('.toggle-add-url').click();await p.locator('#entry_url').fill('https://utilibre.org/en/');await p.locator('#entry_url').press('Enter');
  await p.waitForURL(u=>u.pathname!=='/new'); await p.goto(origin+'/unread/list');
  await p.locator('a[href^="/view/"]').filter({hasText:/Free online tools/}).first().click();
  assert.match(await p.locator('#article').innerText(),/Utilibre/);
  assert.doesNotMatch(await p.locator('#article').innerText(),/can't retrieve contents/);
  const b=await context(1280),bp=await login(b,data.b);
  assert.equal((await bp.goto(`${origin}/view/${data.entryId}`)).status(),404);
  assert.equal((await b.request.get(`${origin}/export/${data.entryId}.json`)).status(),404);
  const anon=await context(390),ap=await anon.newPage(); await ap.goto(`${origin}/view/${data.entryId}`);await ap.locator('[name="_password"]').waitFor();
  for(const path of ['/assets/images/example.jpg','/share/fictional','/feed/fictional','/register/','/api/entries','/oauth/v2/token']) assert.equal((await anon.request.get(origin+path)).status(),404,path);
  const secureContext=await context(390);
  const secure=await secureContext.request.get(origin+'/login',{headers:{'X-Forwarded-Proto':'https'},maxRedirects:0});
  assert.match(secure.headers()['set-cookie'],/secure/i);assert.match(secure.headers()['set-cookie'],/httponly/i);
  const bounded=await Promise.all(Array.from({length:5},()=>anon.request.get(origin+'/new-entry')));
  assert(bounded.some(r=>r.status()===429),'Aggregate fetch limit did not engage');
  assert.deepEqual([...outside],[]);assert.deepEqual(errors,[]);assert.deepEqual(assets,[]);
  const report={checkedAt:new Date().toISOString(),environment:'Production PHP-FPM/Nginx images; private loopback; Linux Chromium 1280px and 390px emulation',mfa:true,accountIsolation:true,anonymousDenied:true,exports:['json','txt','pdf','epub'],ownedArticleFetch:true,remoteArticleMediaHiddenAndBlocked:true,secureHttpOnlyCookieBehindHttpsEdge:true,aggregateFetchLimit:true,externalResponses:[...outside],scriptErrors:errors,failedAssets:assets,untested:['physical Windows/Opera','public TLS route']};
  await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));console.log(`Evidence: ${output}`);
}finally{await browser.close();}
